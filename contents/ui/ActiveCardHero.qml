import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import "js/TimeUtils.js" as TimeUtils

Rectangle {
    id: root

    property var activeCard: null
    property bool isRunning: false
    property int todaySeconds: 0
    property int userTotalSeconds: 0
    property int globalTotalSeconds: 0

    readonly property bool isNarrow: width < Kirigami.Units.gridUnit * 18
    implicitHeight: isNarrow ? (Kirigami.Units.gridUnit * 9.5) : (Kirigami.Units.gridUnit * 7)
    clip: true

    signal toggleTimer()

    radius: Kirigami.Units.smallSpacing * 2
    color: Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.05)
    border.color: isRunning ?
                  Kirigami.Theme.positiveTextColor :
                  Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.15)
    border.width: isRunning ? 2 : 1

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.gridUnit
        spacing: Kirigami.Units.smallSpacing

        // Top info row
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            Rectangle {
                height: 24
                width: heroCode.implicitWidth + 14
                radius: 4
                color: Kirigami.Theme.highlightColor

                QQC2.Label {
                    id: heroCode
                    anchors.centerIn: parent
                    text: root.activeCard ? (root.activeCard.card_code || "") : "—"
                    font.bold: true
                    font.family: "Monospace"
                    color: Kirigami.Theme.highlightedTextColor
                    elide: Text.ElideRight
                }
            }

            QQC2.Label {
                Layout.fillWidth: true
                text: root.activeCard ? (root.activeCard.card_title || "") : i18n("No card selected")
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 1.05
                elide: Text.ElideRight
            }

            QQC2.Label {
                text: root.activeCard ? (root.activeCard.column_name || "") : ""
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                opacity: 0.7
                elide: Text.ElideRight
                Layout.maximumWidth: Kirigami.Units.gridUnit * 6
            }
        }

        Item { height: Kirigami.Units.smallSpacing }

        // Central timer and main action button in responsive grid
        GridLayout {
            Layout.fillWidth: true
            columns: root.isNarrow ? 1 : 2
            columnSpacing: Kirigami.Units.gridUnit
            rowSpacing: Kirigami.Units.smallSpacing

            // Dual time counters
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                RowLayout {
                    spacing: Kirigami.Units.smallSpacing
                    QQC2.Label {
                        text: i18n("Today (Yours):")
                        font.pixelSize: Kirigami.Units.gridUnit * 0.8
                        opacity: 0.75
                        elide: Text.ElideRight
                    }
                    QQC2.Label {
                        text: TimeUtils.formatSeconds(root.todaySeconds)
                        font.pixelSize: Kirigami.Units.gridUnit * 1.5
                        font.bold: true
                        font.family: "Monospace"
                        color: root.isRunning ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.textColor
                    }
                }

                RowLayout {
                    spacing: Kirigami.Units.smallSpacing
                    QQC2.Label {
                        text: i18n("Total (Yours): %1", TimeUtils.formatSeconds(root.userTotalSeconds))
                        font.pixelSize: Kirigami.Units.gridUnit * 0.75
                        font.family: "Monospace"
                        opacity: 0.85
                        elide: Text.ElideRight
                    }
                    QQC2.Label {
                        text: i18n("• All: %1", TimeUtils.formatSeconds(root.globalTotalSeconds))
                        font.pixelSize: Kirigami.Units.gridUnit * 0.75
                        font.family: "Monospace"
                        opacity: 0.6
                        elide: Text.ElideRight
                    }
                }
            }

            // Big Start/Pause Button
            QQC2.Button {
                id: actionButton
                enabled: !!root.activeCard
                Layout.fillWidth: root.isNarrow
                Layout.preferredHeight: Kirigami.Units.gridUnit * 2.5
                Layout.preferredWidth: root.isNarrow ? -1 : Kirigami.Units.gridUnit * 5.5
                text: root.isRunning ? i18n("Pause") : i18n("Start")
                icon.name: root.isRunning ? "media-playback-pause" : "media-playback-start"

                onClicked: root.toggleTimer()
            }
        }
    }
}
