import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import "js/TimeUtils.js" as TimeUtils

Item {
    id: root

    Layout.minimumWidth: contentRow.implicitWidth + (Kirigami.Units.smallSpacing * 2)
    Layout.preferredWidth: contentRow.implicitWidth + (Kirigami.Units.smallSpacing * 2)

    MouseArea {
        anchors.fill: parent
        onClicked: Plasmoid.expanded = !Plasmoid.expanded
    }

    RowLayout {
        id: contentRow
        anchors.centerIn: parent
        spacing: Kirigami.Units.smallSpacing

        // Pulsing running dot
        Rectangle {
            width: 8
            height: 8
            radius: 4
            color: Kirigami.Theme.positiveTextColor
            visible: plasmoidRoot.isActiveCardRunning

            SequentialAnimation on opacity {
                running: plasmoidRoot.isActiveCardRunning
                loops: Animation.Infinite
                NumberAnimation { from: 1.0; to: 0.2; duration: 800 }
                NumberAnimation { from: 0.2; to: 1.0; duration: 800 }
            }
        }

        Kirigami.Icon {
            source: "chronometer"
            implicitWidth: 16
            implicitHeight: 16
            visible: !plasmoidRoot.isActiveCardRunning
        }

        // Active Card Code
        QQC2.Label {
            text: plasmoidRoot.activeCard ? plasmoidRoot.activeCard.card_code : "FATTO"
            font.bold: true
            font.family: "Monospace"
        }

        // Timer counter
        QQC2.Label {
            text: TimeUtils.formatSeconds(plasmoidRoot.activeCardTodaySeconds)
            font.family: "Monospace"
            font.bold: plasmoidRoot.isActiveCardRunning
            color: plasmoidRoot.isActiveCardRunning ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.textColor
        }

        // Quick toggle
        QQC2.ToolButton {
            icon.name: plasmoidRoot.isActiveCardRunning ? "media-playback-pause" : "media-playback-start"
            enabled: plasmoidRoot.activeCard !== null
            implicitWidth: 24
            implicitHeight: 24
            onClicked: plasmoidRoot.toggleActiveCardTimer()
        }
    }
}
