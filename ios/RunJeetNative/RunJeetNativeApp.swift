import SwiftUI
import WebKit
import CoreMotion

@main
struct RunJeetNativeApp: App {
    var body: some Scene {
        WindowGroup { RunJeetWebView() }
    }
}

struct RunJeetWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "runJeetPedometer")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        let web = WKWebView(frame: .zero, configuration: config)
        web.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.webView = web
        if let url = URL(string: "https://sbscorpsales-ship-it.github.io/RunJeet/") {
            web.load(URLRequest(url: url))
        }
        context.coordinator.startPedometer()
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.stopPedometer()
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let pedometer = CMPedometer()
        private var active = false

        func startPedometer() {
            guard CMPedometer.isStepCountingAvailable(), !active else { return }
            active = true
            let start = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: start, to: Date()) { [weak self] data, _ in
                guard let self, let count = data?.numberOfSteps.intValue else { return }
                self.sendSteps(count)
            }
            pedometer.startUpdates(from: start) { [weak self] data, _ in
                guard let self, let count = data?.numberOfSteps.intValue else { return }
                self.sendSteps(count)
            }
        }

        func stopPedometer() {
            pedometer.stopUpdates()
            active = false
        }

        private func sendSteps(_ count: Int) {
            DispatchQueue.main.async { [weak self] in
                let js = "window.dispatchEvent(new CustomEvent('runjeetNativeSteps',{detail:{steps:\(count)}}));"
                self?.webView?.evaluateJavaScript(js)
            }
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {}
    }
}
