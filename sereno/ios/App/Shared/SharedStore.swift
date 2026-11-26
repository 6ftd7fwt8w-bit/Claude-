import Foundation

/// Datos compartidos entre la app y el widget (App Group).
/// Si cambias el identificador de la app, cambia también este grupo
/// (y el de los dos archivos .entitlements).
enum SharedStore {
    static let appGroup = "group.app.sereno.ios"
    static let snapshotKey = "widgetSnapshot"
    static let actionsKey = "pendingActions"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }
}
