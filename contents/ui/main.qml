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
    property var allRunningTimers: []
    property var otherRunningTimers: []

    // Workspace state
    property var workspaceList: []
    property string selectedWorkspaceId: Plasmoid.configuration.selectedWorkspace || ""

    // Helper functions
    function handleApiError(err, status) {
        if (!err && !status) return;
        var is401 = status === 401 ||
                    (err && err.status === 401) ||
                    (err && err.message && (err.message.indexOf("401") !== -1 || err.message.indexOf("Unauthorized") !== -1));
        if (is401) {
            authToken = "";
        }
    }

    function isCardIdRunning(cardId) {
        if (!cardId) return false;
        if (activeCard && activeCard.id_card === cardId && isActiveCardRunning) return true;
        for (var i = 0; i < allRunningTimers.length; i++) {
            if (allRunningTimers[i].id_card === cardId) return true;
        }
        for (var j = 0; j < otherRunningTimers.length; j++) {
            if (otherRunningTimers[j].id_card === cardId) return true;
        }
        return false;
    }

    function partitionRunningTimers(newActiveCardId) {
        var targetId = newActiveCardId !== undefined ? newActiveCardId : (activeCard ? activeCard.id_card : "");
        var pool = allRunningTimers.slice();
        if (pool.length === 0 && otherRunningTimers.length > 0) {
            pool = otherRunningTimers.slice();
        }

        var others = [];
        var activeRunning = false;
        var now = Date.now();

        for (var i = 0; i < pool.length; i++) {
            var item = pool[i];
            item.elapsedSeconds = TimeUtils.calculateSessionSeconds(item.started, null, now);
            if (targetId && item.id_card === targetId) {
                activeRunning = true;
            } else {
                others.push(item);
            }
        }

        isActiveCardRunning = activeRunning;
        otherRunningTimers = others;
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
            currentUser = data.user || data;
            statusMessage = "";
            callback(null, authToken);
        });
    }

    function selectWorkspace(wsId) {
        selectedWorkspaceId = wsId || "";
        Plasmoid.configuration.selectedWorkspace = selectedWorkspaceId;
        refreshData();
    }

    function loadWorkspaces(token, callback) {
        var sUrl = Plasmoid.configuration.serverUrl;
        FattoClient.getWorkspaces(sUrl, token, function(err, items, status) {
            if (err) {
                handleApiError(err, status);
            } else if (Array.isArray(items)) {
                var list = [{ id: "", name: i18n("All Workspaces") }];
                var foundSelected = false;
                for (var i = 0; i < items.length; i++) {
                    list.push({ id: items[i].id, name: items[i].name });
                    if (items[i].id === selectedWorkspaceId) {
                        foundSelected = true;
                    }
                }
                if (selectedWorkspaceId && !foundSelected) {
                    selectedWorkspaceId = "";
                    Plasmoid.configuration.selectedWorkspace = "";
                }
                workspaceList = list;
            }
            if (typeof callback === "function") callback(err, workspaceList);
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

            // Ensure workspace list is up to date
            loadWorkspaces(token);

            var onScheduleFetched = function(sErr, items, sStatus) {
                if (sErr) {
                    statusMessage = i18n("Network error: failed to fetch schedule");
                    handleApiError(sErr, sStatus);
                } else if (items) {
                    statusMessage = "";
                    scheduleList = items;
                    // Auto-select first card if none active
                    if (!activeCard && items.length > 0) {
                        selectCard(items[0]);
                    }
                }

                // 2. Fetch my active timers
                FattoClient.getMyTimers(sUrl, token, function(tErr, myTimers, tStatus) {
                    if (tErr) {
                        handleApiError(tErr, tStatus);
                    } else if (myTimers) {
                        updateRunningTimers(myTimers);
                    }

                    // 3. Refresh sessions for active card if selected
                    if (activeCard) {
                        loadActiveCardSessions();
                    }

                    isSyncing = false;
                });
            };

            if (selectedWorkspaceId !== "") {
                FattoClient.getBoards(sUrl, token, selectedWorkspaceId, function(bErr, boards, bStatus) {
                    if (bErr) {
                        handleApiError(bErr, bStatus);
                        onScheduleFetched(bErr, null, bStatus);
                        return;
                    }
                    var boardIds = [];
                    if (Array.isArray(boards)) {
                        for (var i = 0; i < boards.length; i++) {
                            var bId = boards[i].id || boards[i].id_board;
                            if (bId) {
                                boardIds.push(bId);
                            }
                        }
                    }
                    if (boardIds.length === 0) {
                        onScheduleFetched(null, [], 200);
                        return;
                    }
                    FattoClient.getSchedule(sUrl, token, todayStr, boardIds, onScheduleFetched);
                });
            } else {
                FattoClient.getSchedule(sUrl, token, todayStr, null, onScheduleFetched);
            }
        });
    }

    function selectCard(card) {
        if (!card) {
            activeCard = null;
            isActiveCardRunning = false;
            activeCardTodaySeconds = 0;
            activeCardUserTotalSeconds = 0;
            activeCardGlobalTotalSeconds = 0;
            partitionRunningTimers("");
            return;
        }

        // If current activeCard was running, ensure it is recorded in allRunningTimers before switching
        if (activeCard && isActiveCardRunning) {
            var found = false;
            for (var i = 0; i < allRunningTimers.length; i++) {
                if (allRunningTimers[i].id_card === activeCard.id_card) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                var copy = allRunningTimers.slice();
                copy.push({
                    id_card: activeCard.id_card,
                    card_title: activeCard.card_title || "",
                    started: Date.now()
                });
                allRunningTimers = copy;
            }
        }

        activeCard = card;
        isActiveCardRunning = isCardIdRunning(card.id_card);
        partitionRunningTimers(card.id_card);
        activeCardTodaySeconds = 0;
        activeCardUserTotalSeconds = 0;
        activeCardGlobalTotalSeconds = 0;
        loadActiveCardSessions();
    }

    function updateRunningTimers(myTimers) {
        allRunningTimers = myTimers || [];
        partitionRunningTimers(activeCard ? activeCard.id_card : "");
    }

    function loadActiveCardSessions() {
        if (!activeCard || !authToken) return;

        var sUrl = Plasmoid.configuration.serverUrl;
        var targetCardId = activeCard.id_card;
        FattoClient.getCardSessions(sUrl, authToken, targetCardId, function(err, sessions, status) {
            if (!activeCard || activeCard.id_card !== targetCardId) return;
            if (err) {
                handleApiError(err, status);
                return;
            }
            if (!sessions) return;

            var today = new Date();
            var myUserId = currentUser ? (currentUser.id || currentUser.id_user) : "";
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
                FattoClient.pauseTimer(sUrl, token, cardId, function(pErr, pData, pStatus) {
                    if (pErr) {
                        handleApiError(pErr, pStatus);
                    } else {
                        isActiveCardRunning = false;
                        allRunningTimers = allRunningTimers.filter(function(t) { return t.id_card !== cardId; });
                        partitionRunningTimers(cardId);
                        refreshData();
                    }
                });
            } else {
                // Start
                FattoClient.startTimer(sUrl, token, cardId, function(sErr, sData, sStatus) {
                    if (sErr) {
                        handleApiError(sErr, sStatus);
                    } else {
                        isActiveCardRunning = true;
                        var exists = false;
                        for (var i = 0; i < allRunningTimers.length; i++) {
                            if (allRunningTimers[i].id_card === cardId) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists) {
                            var copy = allRunningTimers.slice();
                            copy.push({
                                id_card: cardId,
                                card_title: activeCard ? (activeCard.card_title || "") : "",
                                started: Date.now()
                            });
                            allRunningTimers = copy;
                        }
                        partitionRunningTimers(cardId);
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
            FattoClient.pauseTimer(sUrl, token, cardId, function(pErr, pData, pStatus) {
                if (pErr) {
                    handleApiError(pErr, pStatus);
                } else {
                    allRunningTimers = allRunningTimers.filter(function(t) { return t.id_card !== cardId; });
                    partitionRunningTimers();
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
