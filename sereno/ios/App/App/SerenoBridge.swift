import Foundation
import Capacitor
import EventKit
import WidgetKit

/// Puente entre la web de Sereno y iOS:
/// - comparte con el widget la "foto" del día y recoge lo que se marcó desde el widget
/// - lee las citas del Calendario del iPhone para no poner tareas encima
@objc(SerenoBridgePlugin)
public class SerenoBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SerenoBridgePlugin"
    public let jsName = "SerenoBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestCalendarAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCalendarEvents", returnType: CAPPluginReturnPromise),
    ]

    private let eventStore = EKEventStore()

    // MARK: widget

    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Falta json")
            return
        }
        SharedStore.defaults?.set(json, forKey: SharedStore.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func getPendingActions(_ call: CAPPluginCall) {
        call.resolve(["json": SharedStore.defaults?.string(forKey: SharedStore.actionsKey) ?? "[]"])
    }

    @objc func clearPendingActions(_ call: CAPPluginCall) {
        SharedStore.defaults?.removeObject(forKey: SharedStore.actionsKey)
        call.resolve()
    }

    // MARK: calendario

    @objc func requestCalendarAccess(_ call: CAPPluginCall) {
        let done: (Bool, Error?) -> Void = { granted, _ in call.resolve(["granted": granted]) }
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents(completion: done)
        } else {
            eventStore.requestAccess(to: .event, completion: done)
        }
    }

    @objc func getCalendarEvents(_ call: CAPPluginCall) {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"

        guard let from = call.getString("from"), let start = formatter.date(from: from) else {
            call.reject("Fecha no válida")
            return
        }
        let days = call.getInt("days") ?? 60
        let calendar = Calendar.current
        guard let end = calendar.date(byAdding: .day, value: days, to: start) else {
            call.reject("Rango no válido")
            return
        }
        let predicate = eventStore.predicateForEvents(withStart: start, end: end, calendars: nil)
        let events: [[String: Any]] = eventStore.events(matching: predicate)
            .filter { !$0.isAllDay }
            .compactMap { event in
                guard let s = event.startDate, let e = event.endDate else { return nil }
                let c = calendar.dateComponents([.hour, .minute], from: s)
                return [
                    "uid": event.calendarItemIdentifier,
                    "title": event.title ?? "Cita",
                    "date": formatter.string(from: s),
                    "start": (c.hour ?? 0) * 60 + (c.minute ?? 0),
                    "duration": max(5, Int(e.timeIntervalSince(s) / 60)),
                ]
            }
        call.resolve(["events": events])
    }
}
