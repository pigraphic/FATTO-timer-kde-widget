import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import "js/TimeUtils.js" as TimeUtils

Item {
    id: root
    clip: true

    Layout.minimumWidth: Kirigami.Units.gridUnit * 22
    Layout.minimumHeight: Kirigami.Units.gridUnit * 26
    Layout.preferredWidth: Kirigami.Units.gridUnit * 24
    Layout.preferredHeight: Kirigami.Units.gridUnit * 28

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.gridUnit
        spacing: Kirigami.Units.smallSpacing * 2
        clip: true

        // Header bar row 1: App icon, Title & Date, Refresh, Configure
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            Kirigami.Icon {
                source: "chronometer"
                implicitWidth: 22
                implicitHeight: 22
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 0

                QQC2.Label {
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                    text: i18n("FATTO Tasks")
                    font.bold: true
                    font.pixelSize: Kirigami.Units.gridUnit * 0.95
                }
                QQC2.Label {
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                    text: TimeUtils.formatHeaderDate(new Date())
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                    opacity: 0.7
                }
            }

            QQC2.ToolButton {
                icon.name: "view-refresh"
                QQC2.ToolTip.text: i18n("Refresh data")
                QQC2.ToolTip.visible: hovered
                onClicked: plasmoidRoot.refreshData()
            }

            QQC2.ToolButton {
                icon.name: "configure"
                QQC2.ToolTip.text: i18n("Configure FATTO widget")
                QQC2.ToolTip.visible: hovered
                onClicked: {
                    var act = (typeof Plasmoid.action === "function") ? Plasmoid.action("configure") : (typeof Plasmoid.internalAction === "function" ? Plasmoid.internalAction("configure") : null);
                    if (act && typeof act.trigger === "function") act.trigger();
                }
            }
        }

        // Header bar row 2: Domain and Workspace selector comboboxes
        GridLayout {
            Layout.fillWidth: true
            columns: (root.width >= Kirigami.Units.gridUnit * 22 && domainRow.visible && workspaceRow.visible) ? 2 : 1
            rowSpacing: Kirigami.Units.smallSpacing
            columnSpacing: Kirigami.Units.smallSpacing

            // Domain selector
            RowLayout {
                id: domainRow
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing
                visible: plasmoidRoot.domainList && plasmoidRoot.domainList.length > 1

                Kirigami.Icon {
                    source: "network-server-symbolic"
                    implicitWidth: 16
                    implicitHeight: 16
                    opacity: 0.7
                }

                QQC2.ComboBox {
                    id: domainComboBox
                    Layout.fillWidth: true
                    model: plasmoidRoot.domainList

                    currentIndex: {
                        if (!plasmoidRoot.domainList) return 0;
                        var idx = plasmoidRoot.domainList.indexOf(plasmoidRoot.selectedDomain);
                        return idx >= 0 ? idx : 0;
                    }

                    onActivated: function(index) {
                        var d = plasmoidRoot.domainList[index];
                        if (d && d !== plasmoidRoot.selectedDomain) {
                            plasmoidRoot.selectDomain(d);
                        }
                    }
                }
            }

            // Workspace selector
            RowLayout {
                id: workspaceRow
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing
                visible: plasmoidRoot.workspaceList && plasmoidRoot.workspaceList.length > 0

                Kirigami.Icon {
                    source: "folder-symbolic"
                    implicitWidth: 16
                    implicitHeight: 16
                    opacity: 0.7
                }

                QQC2.ComboBox {
                    id: workspaceComboBox
                    Layout.fillWidth: true
                    model: plasmoidRoot.workspaceList
                    textRole: "name"
                    valueRole: "id"

                    currentIndex: {
                        if (!plasmoidRoot.workspaceList) return 0;
                        for (var i = 0; i < plasmoidRoot.workspaceList.length; i++) {
                            if (plasmoidRoot.workspaceList[i].id === plasmoidRoot.selectedWorkspaceId) return i;
                        }
                        return 0;
                    }

                    onActivated: function(index) {
                        var item = plasmoidRoot.workspaceList[index];
                        if (item) plasmoidRoot.selectWorkspace(item.id);
                    }
                }
            }
        }

        // Active Card Hero
        ActiveCardHero {
            Layout.fillWidth: true
            activeCard: plasmoidRoot.activeCard
            isRunning: plasmoidRoot.isActiveCardRunning
            todaySeconds: plasmoidRoot.activeCardTodaySeconds
            userTotalSeconds: plasmoidRoot.activeCardUserTotalSeconds
            globalTotalSeconds: plasmoidRoot.activeCardGlobalTotalSeconds
            onToggleTimer: plasmoidRoot.toggleActiveCardTimer()
        }

        // Other running timers notification banner
        RunningTimersBanner {
            Layout.fillWidth: true
            runningTimers: plasmoidRoot.otherRunningTimers
            onPauseRequested: function(cardId) {
                plasmoidRoot.pauseOtherCard(cardId);
            }
        }

        // Scheduled task section header
        RowLayout {
            Layout.fillWidth: true
            QQC2.Label {
                text: i18n("Scheduled for Today")
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 0.85
            }
            Item { Layout.fillWidth: true }
            QQC2.Label {
                text: i18n("%1 task(s)", plasmoidRoot.scheduleList.length)
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                opacity: 0.7
            }
        }

        // Cards list view
        QQC2.ScrollView {
            visible: plasmoidRoot.scheduleList.length > 0
            Layout.fillWidth: true
            Layout.fillHeight: true

            ListView {
                id: listView
                model: plasmoidRoot.scheduleList
                spacing: Kirigami.Units.smallSpacing
                clip: true

                delegate: CardListItem {
                    width: listView.width
                    cardData: modelData
                    isSelected: plasmoidRoot.activeCard && (plasmoidRoot.activeCard.id_card === modelData.id_card)
                    isRunning: plasmoidRoot.isCardIdRunning(modelData.id_card)
                    onCardClicked: {
                        plasmoidRoot.selectCard(modelData);
                    }
                }
            }
        }

        // Empty state
        QQC2.Label {
            visible: plasmoidRoot.scheduleList.length === 0 && !plasmoidRoot.isSyncing
            Layout.alignment: Qt.AlignCenter
            text: plasmoidRoot.statusMessage || i18n("No tasks scheduled for today.")
            opacity: 0.6
            wrapMode: Text.WordWrap
        }
    }
}
