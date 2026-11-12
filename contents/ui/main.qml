import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import "js/FattoRestClient.js" as FattoClient
import "js/TimeUtils.js" as TimeUtils

PlasmoidItem {
    id: plasmoidRoot

    // Applet metadata and configuration
    preferredRepresentation: Plasmoid.formFactor === PlasmaCore.Types.Horizontal ||
                             Plasmoid.formFactor === PlasmaCore.Types.Vertical ?
                             compactRepresentation : fullRepresentation

    compactRepresentation: CompactRepresentation {}
    fullRepresentation: FullRepresentation {}

    // Authentication and user state
    property string authToken: ""
    property var currentUser: null
    property string statusMessage: ""
    property bool isSyncing: false

    // Card and timer state
    property var activeCard: null
    property bool isActiveCardRunning: false
    property int activeCardTodaySeconds: 0
    property int activeCardUserTotalSeconds: 0
    property int activeCardGlobalTotalSeconds: 0

    // Schedule and other running timers
    property var scheduleList: []
    property var otherRunningTimers: []

    // Helper functions
    function isCardIdRunning(cardId) {
        if (!cardId) return false;
        if (activeCard && activeCard.id_card === cardId && isActiveCardRunning) return true;
        for (var i = 0; i < otherRunningTimers.length; i++) {
            if (otherRunningTimers[i].id_card === cardId) return true;
        }
        return false;
    }

    function ensureAuthenticated(callback) {
        if (authToken && currentUser) {
            return callback(null, authToken);
        }

        var sUrl = Plasmoid.configuration.serverUrl;
        var uName = Plasmoid.configuration.username;
        var pWord = Plasmoid.configuration.password;

        if (!uName || !pWord) {
            statusMessage = i18n("Please configure username and password in settings.");
            return callback(new Error("Missing credentials"));
        }

        statusMessage = i18n("Authenticating...");
        FattoClient.login(sUrl, uName, pWord, function(err, data) {
            if (err) {
                statusMessage = i18n("Login failed: %1", err.message);
                return callback(err);
            }
            authToken = data.token;
            currentUser = data.user;
            statusMessage = "";
            callback(null, authToken);
        });
    }

    function refreshData() {
        if (isSyncing) return;
        isSyncing = true;

        ensureAuthenticated(function(err, token) {
            if (err) {
                isSyncing = false;
                return;
            }

            var sUrl = Plasmoid.configuration.serverUrl;
            var todayStr = TimeUtils.formatDateIso(new Date());

            // 1. Fetch today's schedule
            FattoClient.getSchedule(sUrl, token, todayStr, function(sErr, items) {
                if (!sErr && items) {
                    scheduleList = items;
                    // Auto-select first card if none active
                    if (!activeCard && items.length > 0) {
                        selectCard(items[0]);
                    }
                }

                // 2. Fetch my active timers
                FattoClient.getMyTimers(sUrl, token, function(tErr, myTimers) {
                    if (!tErr && myTimers) {
                        updateRunningTimers(myTimers);
                    }

                    // 3. Refresh sessions for active card if selected
                    if (activeCard) {
                        loadActiveCardSessions();
                    }

                    isSyncing = false;
                });
            });
        });
    }

    function selectCard(card) {
        activeCard = card;
        loadActiveCardSessions();
    }

    function updateRunningTimers(myTimers) {
        var activeId = activeCard ? activeCard.id_card : "";
        var others = [];
        var activeRunning = false;

        var now = Date.now();
        for (var i = 0; i < myTimers.length; i++) {
            var item = myTimers[i];
            item.elapsedSeconds = TimeUtils.calculateSessionSeconds(item.started, null, now);
            if (item.id_card === activeId) {
                activeRunning = true;
            } else {
                others.push(item);
            }
        }

        isActiveCardRunning = activeRunning;
        otherRunningTimers = others;
    }

    function loadActiveCardSessions() {
        if (!activeCard || !authToken) return;

        var sUrl = Plasmoid.configuration.serverUrl;
        FattoClient.getCardSessions(sUrl, authToken, activeCard.id_card, function(err, sessions) {
            if (err || !sessions) return;

            var today = new Date();
            var myUserId = currentUser ? currentUser.id : "";
            var todaySecs = 0;
            var userTotalSecs = 0;
            var globalTotalSecs = 0;
            var now = Date.now();

            for (var i = 0; i < sessions.length; i++) {
                var s = sessions[i];
                var sSecs = TimeUtils.calculateSessionSeconds(s.started, s.ended, now);
                globalTotalSecs += sSecs;

                if (myUserId && s.id_user === myUserId) {
                    userTotalSecs += sSecs;
                    if (TimeUtils.isSameDay(s.started, today)) {
                        todaySecs += sSecs;
                    }
                }
            }

            activeCardTodaySeconds = todaySecs;
            activeCardUserTotalSeconds = userTotalSecs;
            activeCardGlobalTotalSeconds = globalTotalSecs;
        });
    }

    function toggleActiveCardTimer() {
        if (!activeCard) return;

        ensureAuthenticated(function(err, token) {
            if (err) return;
            var sUrl = Plasmoid.configuration.serverUrl;
            var cardId = activeCard.id_card;

            if (isActiveCardRunning) {
                // Pause
                FattoClient.pauseTimer(sUrl, token, cardId, function(pErr) {
                    if (!pErr) {
                        isActiveCardRunning = false;
                        refreshData();
                    }
                });
            } else {
                // Start
                FattoClient.startTimer(sUrl, token, cardId, function(sErr) {
                    if (!sErr) {
                        isActiveCardRunning = true;
                        refreshData();
                    }
                });
            }
        });
    }

    function pauseOtherCard(cardId) {
        ensureAuthenticated(function(err, token) {
            if (err) return;
            var sUrl = Plasmoid.configuration.serverUrl;
            FattoClient.pauseTimer(sUrl, token, cardId, function(pErr) {
                if (!pErr) {
                    refreshData();
                }
            });
        });
    }

    // Local 1-second clock tick timer
    Timer {
        id: clockTickTimer
        interval: 1000
        repeat: true
        running: plasmoidRoot.isActiveCardRunning || (plasmoidRoot.otherRunningTimers.length > 0)
        onTriggered: {
            if (plasmoidRoot.isActiveCardRunning) {
                plasmoidRoot.activeCardTodaySeconds += 1;
                plasmoidRoot.activeCardUserTotalSeconds += 1;
                plasmoidRoot.activeCardGlobalTotalSeconds += 1;
            }

            // Tick other running timers
            if (plasmoidRoot.otherRunningTimers.length > 0) {
                var updated = [];
                for (var i = 0; i < plasmoidRoot.otherRunningTimers.length; i++) {
                    var item = plasmoidRoot.otherRunningTimers[i];
                    item.elapsedSeconds = (item.elapsedSeconds || 0) + 1;
                    updated.push(item);
                }
                plasmoidRoot.otherRunningTimers = updated;
            }
        }
    }

    // Polling timer
    Timer {
        id: pollTimer
        interval: Math.max(10, Plasmoid.configuration.pollInterval || 60) * 1000
        repeat: true
        running: true
        onTriggered: plasmoidRoot.refreshData()
    }

    Component.onCompleted: {
        refreshData();
    }
}
