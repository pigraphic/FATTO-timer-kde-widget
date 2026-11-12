import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Rectangle {
    id: root

    property var cardData: null
    property bool isSelected: false
    property bool isRunning: false

    signal cardClicked()

    height: 52
    radius: Kirigami.Units.smallSpacing
    color: isSelected ?
           Kirigami.Theme.highlightColor :
           (mouseArea.containsMouse ? Kirigami.Theme.hoverColor : "transparent")

    border.color: isSelected ?
                  Kirigami.Theme.highlightColor :
                  Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.15)
    border.width: isSelected ? 2 : 1

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        onClicked: root.cardClicked()
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing * 2
        spacing: Kirigami.Units.smallSpacing * 2

        // Running indicator dot
        Rectangle {
            width: 10
            height: 10
            radius: 5
            visible: root.isRunning
            color: Kirigami.Theme.positiveTextColor

            SequentialAnimation on opacity {
                running: root.isRunning
                loops: Animation.Infinite
                NumberAnimation { from: 1.0; to: 0.3; duration: 800 }
                NumberAnimation { from: 0.3; to: 1.0; duration: 800 }
            }
        }

        // Card Code Pill
        Rectangle {
            height: 22
            width: codeLabel.implicitWidth + 12
            radius: 4
            color: root.isSelected ?
                   Qt.rgba(255, 255, 255, 0.25) :
                   Kirigami.ColorUtils.linearInterpolation(Kirigami.Theme.backgroundColor, Kirigami.Theme.textColor, 0.1)

            QQC2.Label {
                id: codeLabel
                anchors.centerIn: parent
                text: root.cardData ? (root.cardData.card_code || "") : ""
                font.bold: true
                font.family: "Monospace"
                font.pixelSize: Kirigami.Units.gridUnit * 0.7
                color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
            }
        }

        // Card Title
        QQC2.Label {
            Layout.fillWidth: true
            text: root.cardData ? (root.cardData.card_title || "") : ""
            elide: Text.ElideRight
            font.weight: root.isSelected ? Font.Bold : Font.Normal
            color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
        }

        // Column / Board Badge
        QQC2.Label {
            text: root.cardData ? (root.cardData.column_name || "") : ""
            font.pixelSize: Kirigami.Units.gridUnit * 0.65
            opacity: 0.8
            color: root.isSelected ? Kirigami.Theme.highlightedTextColor : Kirigami.Theme.textColor
        }
    }
}
