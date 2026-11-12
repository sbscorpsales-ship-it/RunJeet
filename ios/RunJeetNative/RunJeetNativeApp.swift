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
            if command.hasPrefix("saveWorkout:") { saveWorkout(command.replacingOccurrences(of: "saveWorkout:", with: "")); return }
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

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            let code = (error as? CLError)?.code
            // Core Location can temporarily lose a fix. Keep the workout and
            // route buffer alive; the next valid fix will continue the same session.
            let message: String
            if code == .locationUnknown {
                message = "GPS signal temporarily unavailable. RunJeet is keeping your activity open and waiting for a new fix."
            } else if code == .denied {
                message = "Location access is off. Enable location permission to continue GPS recording. Your saved route is retained."
            } else {
                message = "GPS temporarily unavailable. Your activity remains saved; waiting to reconnect."
            }
            let safe = message.replacingOccurrences(of: "'", with: "")
            let script = "window.dispatchEvent(new CustomEvent('runjeetNativeGpsStatus',{detail:{message:'\\(safe)'}}));"
            DispatchQueue.main.async { self.webView?.evaluateJavaScript(script, completionHandler: nil) }
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
        private var observers: [HKObserverQuery] = []
        private var pageLoaded = false
        private var latestSteps: Int?
        private var latestSource = "IPHONE PEDOMETER"
        private var latestHealthDistance: Double?
        private var latestHealthCalories: Double?
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
            queryHealthActivityTotals()
            queryHealthWorkouts()
        }

        func requestHealthAccessAndStart() {
            guard HKHealthStore.isHealthDataAvailable(),
                  let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
                startPedometer()
                return
            }
            let workout = HKObjectType.workoutType()
            let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
            let walkRunDistance = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!
            let cycleDistance = HKObjectType.quantityType(forIdentifier: .distanceCycling)!
            healthStore.requestAuthorization(toShare: [workout, energy], read: [workout, steps, energy, walkRunDistance, cycleDistance]) { [weak self] _, _ in
                guard let self else { return }
                self.installHealthObservers(for: [workout, steps, energy, walkRunDistance, cycleDistance])
                self.queryHealthSteps()
                self.queryHealthActivityTotals()
                self.queryHealthWorkouts()
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

        private func queryHealthActivityTotals() {
            let start = Calendar.current.startOfDay(for: Date())
            let end = Date()
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
            let group = DispatchGroup()
            var distanceTotal = 0.0
            var caloriesTotal = 0.0
            let distanceTypes: [(HKQuantityTypeIdentifier, HKUnit)] = [
                (.distanceWalkingRunning, .meter()),
                (.distanceCycling, .meter())
            ]
            for (identifier, unit) in distanceTypes {
                guard let type = HKObjectType.quantityType(forIdentifier: identifier) else { continue }
                group.enter()
                let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
                    let value = result?.sumQuantity()?.doubleValue(for: unit) ?? 0
                    DispatchQueue.main.async {
                        distanceTotal += value
                        group.leave()
                    }
                }
                healthStore.execute(query)
            }
            if let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                group.enter()
                let query = HKStatisticsQuery(quantityType: energyType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
                    let value = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                    DispatchQueue.main.async {
                        caloriesTotal = value
                        group.leave()
                    }
                }
                healthStore.execute(query)
            }
            group.notify(queue: .main) {
                self.latestHealthDistance = distanceTotal
                self.latestHealthCalories = caloriesTotal
                self.flushHealthTotals()
            }
        }

        private func queryHealthWorkouts() {
            let workoutType = HKObjectType.workoutType()
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(sampleType: workoutType, predicate: nil, limit: 30, sortDescriptors: [sort]) { [weak self] _, samples, _ in
                guard let self else { return }
                // RunJeet-created sessions already appear in local history; exclude
                // this app's own HealthKit writes to prevent duplicate activity rows.
                let externalWorkouts = (samples as? [HKWorkout] ?? []).filter {
                    $0.sourceRevision.source.bundleIdentifier != Bundle.main.bundleIdentifier
                }
                let records: [[String: Any]] = externalWorkouts.map { workout in
                    let activity: String
                    switch workout.workoutActivityType {
                    case .walking: activity = "Walking"
                    case .running: activity = "Running"
                    case .cycling: activity = "Cycling"
                    case .hiking: activity = "Hiking"
                    case .swimming: activity = "Swimming"
                    case .yoga: activity = "Yoga"
                    case .functionalStrengthTraining, .traditionalStrengthTraining: activity = "Strength Training"
                    default: activity = "Workout"
                    }
                    return [
                        "id": workout.uuid.uuidString,
                        "activityType": activity,
                        "startedAt": workout.startDate.timeIntervalSince1970 * 1000,
                        "durationSec": max(0, workout.duration),
                        "distanceM": workout.totalDistance?.doubleValue(for: .meter()) as Any? ?? NSNull(),
                        "activeCalories": workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) as Any? ?? NSNull(),
                        "sourceName": workout.sourceRevision.source.name
                    ]
                }
                guard let data = try? JSONSerialization.data(withJSONObject: records, options: [.fragmentsAllowed]),
                      let json = String(data: data, encoding: .utf8) else { return }
                DispatchQueue.main.async {
                    guard self.pageLoaded else { return }
                    let script = "window.dispatchEvent(new CustomEvent('runjeetNativeHealthWorkouts',{detail:{records:\(json)}}));"
                    self.webView?.evaluateJavaScript(script, completionHandler: nil)
                }
            }
            healthStore.execute(query)
        }

        private func flushHealthTotals() {
            guard pageLoaded, latestHealthDistance != nil || latestHealthCalories != nil else { return }
            let distance = latestHealthDistance ?? 0
            let calories = latestHealthCalories ?? 0
            let script = "window.dispatchEvent(new CustomEvent('runjeetNativeHealth',{detail:{distanceMeters:\(distance),activeCalories:\(calories),source:'APPLE HEALTH'}}));"
            webView?.evaluateJavaScript(script, completionHandler: nil)
        }

        private func installHealthObservers(for types: [HKSampleType]) {
            for type in types {
                let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
                    self?.queryHealthSteps()
                    self?.queryHealthActivityTotals()
                    completion()
                }
                observers.append(query)
                healthStore.execute(query)
                healthStore.enableBackgroundDelivery(for: type, frequency: .hourly) { _, _ in }
            }
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
            observers.forEach { healthStore.stop($0) }
            observers.removeAll()
        }


        private func saveWorkout(_ payload: String) {
            guard let data = payload.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let startMs = object["startTime"] as? Double,
                  let endMs = object["endTime"] as? Double,
                  endMs > startMs else { return }
            let start = Date(timeIntervalSince1970: startMs / 1000)
            let end = Date(timeIntervalSince1970: endMs / 1000)
            let distance = (object["distanceM"] as? Double) ?? 0
            let calories = (object["activeCalories"] as? Double) ?? 0
            let distanceQuantity = distance > 0 ? HKQuantity(unit: .meter(), doubleValue: distance) : nil
            let energyQuantity = calories > 0 ? HKQuantity(unit: .kilocalorie(), doubleValue: calories) : nil
            let activityType: HKWorkoutActivityType
            switch (object["activityType"] as? String ?? "").lowercased() {
            case "outdoor run", "run", "running": activityType = .running
            case "outdoor cycle", "cycle", "cycling", "biking": activityType = .cycling
            case "outdoor walk", "walk", "walking": activityType = .walking
            default: activityType = .other
            }
            let workout = HKWorkout(activityType: activityType, start: start, end: end,
                                    workoutEvents: nil, totalEnergyBurned: energyQuantity,
                                    totalDistance: distanceQuantity, metadata: [HKMetadataKeyWasUserEntered: true])
            healthStore.save(workout) { _, _ in }
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
