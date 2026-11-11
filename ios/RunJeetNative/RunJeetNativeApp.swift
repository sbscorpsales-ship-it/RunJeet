import SwiftUI
import UIKit
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
        web.navigationDelegate = context.coordinator
        context.coordinator.webView = web
        if let url = URL(string: "https://sbscorpsales-ship-it.github.io/RunJeet/") {
            web.load(URLRequest(url: url))
        }
        context.coordinator.requestHealthAccessAndStart()
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.stop()
        uiView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        weak var webView: WKWebView?
        private let pedometer = CMPedometer()
        private let healthStore = HKHealthStore()
        private var pedometerActive = false
        private var observer: HKObserverQuery?
        private var pageLoaded = false
        private var latestSteps: Int?
        private var latestSource = "IPHONE PEDOMETER"

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            pageLoaded = true
            flushLatestSteps()
            queryHealthSteps()
        }

        func requestHealthAccessAndStart() {
            guard HKHealthStore.isHealthDataAvailable(),
                  let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
                startPedometer()
                return
            }
            healthStore.requestAuthorization(toShare: [], read: [steps]) { [weak self] _, _ in
                guard let self else { return }
                self.installHealthObserver(for: steps)
                self.queryHealthSteps()
                self.startPedometer()
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
            let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
                self?.queryHealthSteps()
                completion()
            }
            observer = query
            healthStore.execute(query)
            healthStore.enableBackgroundDelivery(for: type, frequency: .hourly) { _, _ in }
        }

        private func startPedometer() {
            guard CMPedometer.isStepCountingAvailable(), !pedometerActive else { return }
            pedometerActive = true
            let start = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: start, to: Date()) { [weak self] data, _ in
                guard let count = data?.numberOfSteps.intValue else { return }
                self?.sendSteps(count, source: "IPHONE PEDOMETER")
            }
            pedometer.startUpdates(from: start) { [weak self] data, _ in
                guard let count = data?.numberOfSteps.intValue else { return }
                self?.sendSteps(count, source: "IPHONE PEDOMETER")
            }
        }

        func stop() {
            pedometer.stopUpdates()
            pedometerActive = false
            if let observer { healthStore.stop(observer) }
        }

        private func sendSteps(_ count: Int, source: String) {
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                // HealthKit is the preferred consolidated source; Core Motion is fallback.
                if self.latestSource.contains("HEALTH") && !source.contains("HEALTH") { return }
                self.latestSteps = max(0, count)
                self.latestSource = source
                self.flushLatestSteps()
            }
        }

        private func flushLatestSteps() {
            guard pageLoaded, let count = latestSteps else { return }
            let safeSource = latestSource.replacingOccurrences(of: "'", with: "")
            let script = "window.dispatchEvent(new CustomEvent('runjeetNativeSteps',{detail:{steps:\(count),source:'\(safeSource)'}}));"
            webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }
}
