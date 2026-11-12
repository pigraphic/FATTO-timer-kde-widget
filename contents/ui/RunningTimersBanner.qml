import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import "js/TimeUtils.js" as TimeUtils

Rectangle {
    id: root

    property var runningTimers: []
    signal pauseRequested(string cardId)

    visible: runningTimers && runningTimers.length > 0
    height: visible ? columnLayout.implicitHeight + (Kirigami.Units.smallSpacing * 2) : 0
    implicitHeight: height
    radius: Kirigami.Units.smallSpacing
    color: Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.neutralTextColor, 0.15)
    border.color: Kirigami.Theme.neutralTextColor
    border.width: 1

    ColumnLayout {
        id: columnLayout
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing
        spacing: Kirigami.Units.smallSpacing

        RowLayout {
            Layout.fillWidth: true
            Kirigami.Icon {
                source: "dialog-warning"
                implicitWidth: 16
                implicitHeight: 16
                color: Kirigami.Theme.neutralTextColor
            }
            QQC2.Label {
                Layout.fillWidth: true
                text: i18n("%1 other task(s) currently running", root.runningTimers.length)
                font.bold: true
                font.pixelSize: Kirigami.Units.gridUnit * 0.75
                color: Kirigami.Theme.neutralTextColor
            }
        }

        Repeater {
            model: root.runningTimers

            delegate: RowLayout {
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing

                QQC2.Label {
                    text: modelData.code || ""
                    font.family: "Monospace"
                    font.bold: true
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.Label {
                    Layout.fillWidth: true
                    text: modelData.title || ""
                    elide: Text.ElideRight
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.Label {
                    text: TimeUtils.formatSeconds(modelData.elapsedSeconds || 0)
                    font.family: "Monospace"
                    font.pixelSize: Kirigami.Units.gridUnit * 0.7
                }

                QQC2.ToolButton {
                    icon.name: "media-playback-pause"
                    implicitWidth: 24
                    implicitHeight: 24
                    onClicked: root.pauseRequested(modelData.id_card)
                }
            }
        }
    }
}
