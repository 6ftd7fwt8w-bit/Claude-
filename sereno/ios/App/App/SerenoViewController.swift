import UIKit
import Capacitor

/// Igual que el controlador de Capacitor, pero registrando nuestro plugin propio.
class SerenoViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SerenoBridgePlugin())
    }
}
