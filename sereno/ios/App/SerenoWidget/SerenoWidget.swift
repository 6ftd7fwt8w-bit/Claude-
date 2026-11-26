import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Datos (los escribe la app en el App Group: ver src/lib/widget.ts)

struct WidgetSession: Codable, Hashable {
    var id: String
    var title: String
    var time: String
    var minutes: Int
    var emoji: String
    var color: String
    var done: Bool
    var date: String
}

struct Snapshot: Codable {
    var updatedAt: String
    var date: String
    var name: String
    var phrase: String
    var energy: Int
    var level: String
    var levelText: String
    var done: Int
    var total: Int
    var sessions: [WidgetSession]
    var leaves: Int
    var flowers: Int
    var drops: Int

    static func load() -> Snapshot? {
        guard let json = SharedStore.defaults?.string(forKey: SharedStore.snapshotKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self), let json = String(data: data, encoding: .utf8) else { return }
        SharedStore.defaults?.set(json, forKey: SharedStore.snapshotKey)
    }

    static let sample = Snapshot(
        updatedAt: "", date: dayKey(Date()), name: "", phrase: "Los pequeños progresos también son avances.",
        energy: 60, level: "verde", levelText: "Día tranquilo", done: 1, total: 3,
        sessions: [
            WidgetSession(id: "a", title: "Meditar", time: "07:50", minutes: 10, emoji: "🧘", color: "#6FAF9A", done: true, date: dayKey(Date())),
            WidgetSession(id: "b", title: "Proyecto personal", time: "18:30", minutes: 60, emoji: "✨", color: "#7E98D1", done: false, date: dayKey(Date())),
            WidgetSession(id: "c", title: "Llamar a mamá", time: "20:00", minutes: 20, emoji: "💛", color: "#E59A8C", done: false, date: dayKey(Date())),
        ],
        leaves: 24, flowers: 3, drops: 41
    )
}

func dayKey(_ date: Date) -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date)
}

func minutesOf(_ hhmm: String) -> Int {
    let p = hhmm.split(separator: ":").compactMap { Int($0) }
    return p.count == 2 ? p[0] * 60 + p[1] : 0
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
    static let serenoBg = Color(red: 0.93, green: 0.95, blue: 0.93)
    static let serenoAccent = Color(hex: "#5F9F89")
    static let serenoInk = Color(hex: "#2F3B36")
}

// MARK: - Marcar como hecho desde el widget (iOS 17+)

struct CompleteSessionIntent: AppIntent {
    static let title: LocalizedStringResource = "Marcar como hecho"
    static let description = IntentDescription("Marca una tarea de Sereno como hecha.")

    @Parameter(title: "Sesión") var sessionId: String

    init() {}
    init(sessionId: String) { self.sessionId = sessionId }

    func perform() async throws -> some IntentResult {
        // 1. se apunta para que la app lo aplique (gotas, hojas del bonsái…) al abrirse
        let defaults = SharedStore.defaults
        var actions: [[String: Any]] = []
        if let json = defaults?.string(forKey: SharedStore.actionsKey),
           let data = json.data(using: .utf8),
           let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            actions = list
        }
        actions.append(["type": "complete", "sessionId": sessionId, "at": ISO8601DateFormatter().string(from: Date())])
        if let data = try? JSONSerialization.data(withJSONObject: actions), let json = String(data: data, encoding: .utf8) {
            defaults?.set(json, forKey: SharedStore.actionsKey)
        }
        // 2. el widget lo muestra ya como hecho
        if var snap = Snapshot.load(), let i = snap.sessions.firstIndex(where: { $0.id == sessionId }) {
            snap.sessions[i].done = true
            snap.save()
        }
        return .result()
    }
}

// MARK: - Línea de tiempo

struct SerenoEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?

    var today: [WidgetSession] { (snapshot?.sessions ?? []).filter { $0.date == dayKey(date) } }
    var doneCount: Int { today.filter(\.done).count }
    var upcoming: [WidgetSession] {
        let now = Calendar.current.dateComponents([.hour, .minute], from: date)
        let nowMin = (now.hour ?? 0) * 60 + (now.minute ?? 0)
        let pending = today.filter { !$0.done }
        let later = pending.filter { minutesOf($0.time) + $0.minutes >= nowMin }
        return later.isEmpty ? pending : later
    }
    var isStale: Bool { snapshot?.date != dayKey(date) && today.isEmpty }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SerenoEntry { SerenoEntry(date: Date(), snapshot: .sample) }

    func getSnapshot(in context: Context, completion: @escaping (SerenoEntry) -> Void) {
        completion(SerenoEntry(date: Date(), snapshot: context.isPreview ? .sample : (Snapshot.load() ?? .sample)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SerenoEntry>) -> Void) {
        let snap = Snapshot.load()
        let now = Date()
        let cal = Calendar.current
        var dates: [Date] = [now]
        // una entrada al terminar cada sesión de hoy, para que "lo siguiente" avance solo
        for s in snap?.sessions ?? [] where s.date == dayKey(now) {
            let end = minutesOf(s.time) + s.minutes
            if let d = cal.date(bySettingHour: min(23, end / 60), minute: end % 60, second: 0, of: now), d > now { dates.append(d) }
        }
        if let midnight = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) { dates.append(midnight) }
        let entries = dates.sorted().map { SerenoEntry(date: $0, snapshot: snap) }
        completion(Timeline(entries: entries, policy: .after(cal.date(byAdding: .hour, value: 2, to: now) ?? now)))
    }
}

// MARK: - Vistas

struct ProgressRing: View {
    let done: Int
    let total: Int
    var size: CGFloat = 54
    var body: some View {
        let value = total == 0 ? 0 : Double(done) / Double(total)
        ZStack {
            Circle().stroke(Color.serenoAccent.opacity(0.18), lineWidth: 6)
            Circle().trim(from: 0, to: value)
                .stroke(Color.serenoAccent, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(total == 0 ? "🌿" : "\(done)/\(total)").font(.system(size: size * 0.26, weight: .bold, design: .rounded))
        }
        .frame(width: size, height: size)
    }
}

struct SessionRow: View {
    let s: WidgetSession
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: CompleteSessionIntent(sessionId: s.id)) {
                ZStack {
                    Circle().strokeBorder(Color(hex: s.color), lineWidth: 2)
                    if s.done {
                        Circle().fill(Color(hex: s.color))
                        Image(systemName: "checkmark").font(.system(size: 10, weight: .heavy)).foregroundStyle(.white)
                    }
                }
                .frame(width: 22, height: 22)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 0) {
                Text(s.title).font(.system(size: 13, weight: .semibold, design: .rounded)).lineLimit(1)
                    .strikethrough(s.done)
                Text("\(s.time) · \(s.emoji)").font(.system(size: 11, design: .rounded)).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .opacity(s.done ? 0.55 : 1)
    }
}

struct AddButton: View {
    var body: some View {
        Link(destination: URL(string: "sereno://add")!) {
            Image(systemName: "plus")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(Circle().fill(Color.serenoAccent))
        }
    }
}

struct SerenoWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: SerenoEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(entry.doneCount), in: 0...Double(max(entry.today.count, 1))) {
                Text("🌿")
            } currentValueLabel: {
                Text("\(entry.doneCount)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryInline:
            if let next = entry.upcoming.first {
                Text("🌿 \(next.time) \(next.title)")
            } else {
                Text("🌿 \(entry.doneCount)/\(entry.today.count) hecho")
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("Sereno · \(entry.doneCount)/\(entry.today.count)").font(.caption2).foregroundStyle(.secondary)
                if let next = entry.upcoming.first {
                    Text(next.title).font(.headline).lineLimit(1)
                    Text("\(next.time) · \(next.minutes) min").font(.caption)
                } else {
                    Text(entry.today.isEmpty ? "Día libre" : "¡Todo hecho! ✨").font(.headline)
                }
            }
        case .systemSmall:
            small
        case .systemLarge:
            large
        default:
            medium
        }
    }

    var header: some View {
        HStack {
            Text(entry.snapshot?.levelText ?? "Sereno")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Color.serenoAccent)
            Spacer()
            Text("🌳 \(entry.snapshot?.leaves ?? 0)").font(.system(size: 12, weight: .semibold, design: .rounded))
        }
    }

    var empty: some View {
        Text(entry.isStale ? "Abre Sereno para planear tu día 🌅" : entry.today.isEmpty ? "Día libre. Disfruta 🌿" : "¡Todo hecho! Descansa sin culpa ✨")
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
    }

    var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                ProgressRing(done: entry.doneCount, total: entry.today.count, size: 46)
                Spacer()
                Text("🌳 \(entry.snapshot?.leaves ?? 0)").font(.system(size: 12, weight: .semibold, design: .rounded))
            }
            Spacer(minLength: 0)
            if let next = entry.upcoming.first {
                Text("Siguiente").font(.system(size: 11, weight: .semibold, design: .rounded)).foregroundStyle(.secondary)
                Text("\(next.emoji) \(next.title)").font(.system(size: 14, weight: .bold, design: .rounded)).lineLimit(2)
                Text(next.time).font(.system(size: 12, design: .rounded)).foregroundStyle(.secondary)
            } else {
                empty
            }
        }
        .foregroundStyle(Color.serenoInk)
        .widgetURL(URL(string: "sereno://today"))
    }

    var medium: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                ProgressRing(done: entry.doneCount, total: entry.today.count)
                Text(entry.snapshot?.levelText ?? "").font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(Color.serenoAccent)
                Spacer(minLength: 0)
                AddButton()
            }
            VStack(alignment: .leading, spacing: 7) {
                if entry.upcoming.isEmpty {
                    Spacer()
                    empty
                    Spacer()
                } else {
                    ForEach(entry.upcoming.prefix(3), id: \.self) { SessionRow(s: $0) }
                    Spacer(minLength: 0)
                }
            }
        }
        .foregroundStyle(Color.serenoInk)
        .widgetURL(URL(string: "sereno://today"))
    }

    var large: some View {
        VStack(alignment: .leading, spacing: 10) {
            header
            Text("“\(entry.snapshot?.phrase ?? "")”")
                .font(.system(size: 15, weight: .medium, design: .serif))
                .lineLimit(2)
            HStack {
                ProgressRing(done: entry.doneCount, total: entry.today.count, size: 44)
                Text("\(entry.doneCount) de \(entry.today.count) hechas")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Spacer()
                AddButton()
            }
            Divider()
            if entry.today.isEmpty {
                empty
            } else {
                ForEach(entry.today.prefix(6), id: \.self) { SessionRow(s: $0) }
            }
            Spacer(minLength: 0)
            Text("💧 \(entry.snapshot?.drops ?? 0) gotas · 🌸 \(entry.snapshot?.flowers ?? 0) flores")
                .font(.system(size: 11, design: .rounded)).foregroundStyle(.secondary)
        }
        .foregroundStyle(Color.serenoInk)
        .widgetURL(URL(string: "sereno://today"))
    }
}

// MARK: - Widgets

struct SerenoTodayWidget: Widget {
    let kind = "SerenoToday"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SerenoWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color.serenoBg, Color(hex: "#E4ECE6")], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Tu día")
        .description("Lo siguiente que toca, tu progreso y un botón para añadir.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

/// Acceso directo de un toque: añadir, respirar o decir tu energía.
struct SerenoQuickWidget: Widget {
    let kind = "SerenoQuick"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { _ in
            HStack(spacing: 10) {
                quick("plus", "Añadir", "sereno://add")
                quick("wind", "Respirar", "sereno://breathe")
                quick("sun.max", "Energía", "sereno://energy")
                quick("leaf.fill", "Bonsái", "sereno://bonsai")
            }
            .containerBackground(for: .widget) { Color.serenoBg }
        }
        .configurationDisplayName("Acciones rápidas")
        .description("Añadir tarea, respirar, energía y tu bonsái a un toque.")
        .supportedFamilies([.systemMedium])
    }

    func quick(_ icon: String, _ label: String, _ url: String) -> some View {
        Link(destination: URL(string: url)!) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color.serenoAccent)
                    .frame(width: 48, height: 48)
                    .background(Circle().fill(Color.white.opacity(0.85)))
                Text(label).font(.system(size: 11, weight: .semibold, design: .rounded)).foregroundStyle(Color.serenoInk)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

@main
struct SerenoWidgets: WidgetBundle {
    var body: some Widget {
        SerenoTodayWidget()
        SerenoQuickWidget()
    }
}
