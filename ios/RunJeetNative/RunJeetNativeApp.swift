import SwiftUI
import WebKit
import CoreMotion
import HealthKit

@main
struct RunJeetNativeApp: App {
    var body: some Scene { WindowGroup { RunJeetWebView() } }
}

struct RunJeetWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        let web = WKWebView(frame: .zero, configuration: config)
        web.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.webView = web
        if let url = URL(string: "https://sbscorpsales-ship-it.github.io/RunJeet/") {
            web.load(URLRequest(url: url))
        }
        context.coordinator.requestHealthAccessAndStart()
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.stopPedometer()
    }

    final class Coordinator: NSObject {
        weak var webView: WKWebView?
        private let pedometer = CMPedometer()
        private let healthStore = HKHealthStore()
        private var active = false
        private var observer: HKObserverQuery?

        func requestHealthAccessAndStart() {
            guard HKHealthStore.isHealthDataAvailable(),
                  let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
                startPedometerFallback()
                return
            }
            healthStore.requestAuthorization(toShare: [], read: [steps]) { [weak self] granted, _ in
                guard let self else { return }
                if granted { self.queryHealthSteps() } else { self.startPedometerFallback() }
                self.installHealthObserver(for: steps)
                self.startPedometerFallback()
            }
        }

        private func queryHealthSteps() {
            guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
            let start = Calendar.current.startOfDay(for: Date())
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate,
                                          options: .cumulativeSum) { [weak self] _, result, _ in
                guard let total = result?.sumQuantity()?.doubleValue(for: .count()) else { return }
                self?.sendSteps(Int(total), source: "APPLE HEALTH")
            }
            healthStore.execute(query)
        }

        private func installHealthObserver(for type: HKObjectType) {
            let q = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
                self?.queryHealthSteps()
                completion()
            }
            observer = q
            healthStore.execute(q)
            healthStore.enableBackgroundDelivery(for: type, frequency: .hourly) { _, _ in }
        }

        private func startPedometerFallback() {
            guard CMPedometer.isStepCountingAvailable(), !active else { return }
            active = true
            let start = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: start, to: Date()) { [weak self] data, _ in
                guard let self, let count = data?.numberOfSteps.intValue else { return }
                self.sendSteps(count, source: "IPHONE PEDOMETER")
            }
            pedometer.startUpdates(from: start) { [weak self] data, _ in
                guard let self, let count = data?.numberOfSteps.intValue else { return }
                self.sendSteps(count, source: "IPHONE PEDOMETER")
            }
        }

        func stopPedometer() {
            pedometer.stopUpdates()
            active = false
            if let observer { healthStore.stop(observer) }
        }

        private func sendSteps(_ count: Int, source: String) {
            DispatchQueue.main.async { [weak self] in
                let js = "window.dispatchEvent(new CustomEvent('runjeetNativeSteps',{detail:{steps:\(count),source:'\(source)'}}));"
                self?.webView?.evaluateJavaScript(js)
            }
        }
    }
}
