import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import "js/TimeUtils.js" as TimeUtils

Item {
    id: root

    Layout.minimumWidth: Kirigami.Units.gridUnit * 22
    Layout.minimumHeight: Kirigami.Units.gridUnit * 26
    Layout.preferredWidth: Kirigami.Units.gridUnit * 24
    Layout.preferredHeight: Kirigami.Units.gridUnit * 28

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.gridUnit
        spacing: Kirigami.Units.smallSpacing * 2

        // Header bar
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
                    text: i18n("FATTO Tasks")
                    font.bold: true
                    font.pixelSize: Kirigami.Units.gridUnit * 0.95
                }
                QQC2.Label {
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
                onClicked: Plasmoid.action("configure").trigger()
            }
        }

        // Active Card Hero
        ActiveCardHero {
            Layout.fillWidth: true
            Layout.preferredHeight: Kirigami.Units.gridUnit * 7
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
