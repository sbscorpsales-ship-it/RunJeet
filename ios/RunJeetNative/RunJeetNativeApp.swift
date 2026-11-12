import SwiftUI
import UIKit
import WebKit
import CoreMotion
import CoreLocation
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
        controller.add(context.coordinator, name: "runjeet")
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

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
        weak var webView: WKWebView?

        override init() {
            super.init()
            locationManager.delegate = self
            locationManager.activityType = .fitness
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
            locationManager.distanceFilter = 3
            locationManager.pausesLocationUpdatesAutomatically = false
            locationManager.allowsBackgroundLocationUpdates = true
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let command = message.body as? String else { return }
            if command == "startGPS" {
                DispatchQueue.main.async {
                    self.wantsLocationUpdates = true
                    let status = CLLocationManager.authorizationStatus()
                    if status == .notDetermined || status == .authorizedWhenInUse { self.locationManager.requestAlwaysAuthorization() }
                    if CLLocationManager.locationServicesEnabled() && (status == .authorizedAlways || status == .authorizedWhenInUse) {
                        self.locationManager.startUpdatingLocation()
                        self.locationActive = true
                    }
                }
            } else if command == "stopGPS" {
                wantsLocationUpdates = false
                locationManager.stopUpdatingLocation()
                locationActive = false
            } else if command == "clearRoute" {
                routePoints.removeAll()
                persistRoute()
            } else if command == "requestRoute" {
                flushStoredRoute()
            }
        }

        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            let status = manager.authorizationStatus
            if wantsLocationUpdates && CLLocationManager.locationServicesEnabled() && (status == .authorizedAlways || status == .authorizedWhenInUse) {
                manager.startUpdatingLocation()
                locationActive = true
            }
        }

        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard let location = locations.last, location.horizontalAccuracy >= 0, location.horizontalAccuracy <= 60 else { return }
            let point: [String: Double] = ["lat": location.coordinate.latitude, "lon": location.coordinate.longitude, "accuracy": location.horizontalAccuracy, "ts": location.timestamp.timeIntervalSince1970 * 1000]
            if let previous = routePoints.last, let lat = previous["lat"], let lon = previous["lon"], let timestamp = previous["ts"] {
                let prior = CLLocation(latitude: lat, longitude: lon)
                if location.timestamp.timeIntervalSince1970 * 1000 - timestamp <= 1500 && location.distance(from: prior) <= 2 { return }
            }
            routePoints.append(point)
            if routePoints.count > 20000 { routePoints.removeFirst(routePoints.count - 20000) }
            persistRoute()
            let script = "window.dispatchEvent(new CustomEvent('runjeetNativeLocation',{detail:{lat:\(location.coordinate.latitude),lon:\(location.coordinate.longitude),accuracy:\(location.horizontalAccuracy),ts:\(location.timestamp.timeIntervalSince1970 * 1000)}}));"
            DispatchQueue.main.async { self.webView?.evaluateJavaScript(script, completionHandler: nil) }
        }
        private let pedometer = CMPedometer()
        private let healthStore = HKHealthStore()
        private let locationManager = CLLocationManager()
        private var locationActive = false
        private var wantsLocationUpdates = false
        private var pedometerActive = false
        private var observer: HKObserverQuery?
        private var pageLoaded = false
        private var latestSteps: Int?
        private var latestSource = "IPHONE PEDOMETER"
        private let routeStorageKey = "runjeet.native.route.v1"
        private var routePoints: [[String: Double]] = UserDefaults.standard.array(forKey: "runjeet.native.route.v1") as? [[String: Double]] ?? []

        private func persistRoute() { UserDefaults.standard.set(routePoints, forKey: routeStorageKey) }

        private func flushStoredRoute() {
            guard pageLoaded, let data = try? JSONSerialization.data(withJSONObject: routePoints, options: [.fragmentsAllowed, .sortedKeys]), let json = String(data: data, encoding: .utf8) else { return }
            let script = "window.dispatchEvent(new CustomEvent('runjeetNativeRoute',{detail:{points:\(json)}}));"
            DispatchQueue.main.async { self.webView?.evaluateJavaScript(script, completionHandler: nil) }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            pageLoaded = true
            flushLatestSteps()
            flushStoredRoute()
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

        private func installHealthObserver(for type: HKSampleType) {
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
            wantsLocationUpdates = false
            locationManager.stopUpdatingLocation()
            locationActive = false
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
