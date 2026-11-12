import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM
import "js/FattoRestClient.js" as FattoClient

KCM.SimpleKCM {
    id: configPage

    property alias cfg_serverUrl: serverUrlField.text
    property alias cfg_username: usernameField.text
    property alias cfg_password: passwordField.text
    property alias cfg_domain: domainField.text
    property alias cfg_pollInterval: pollIntervalSpin.value
    property string cfg_selectedWorkspace: ""

    Kirigami.FormLayout {
        id: formLayout

        QQC2.TextField {
            id: serverUrlField
            Kirigami.FormData.label: i18n("FATTO Server URL:")
            placeholderText: "https://fatto.os3.services"
            Layout.fillWidth: true
        }

        QQC2.TextField {
            id: usernameField
            Kirigami.FormData.label: i18n("Username:")
            placeholderText: i18n("Username or email")
            Layout.fillWidth: true
        }

        QQC2.TextField {
            id: passwordField
            Kirigami.FormData.label: i18n("Password:")
            echoMode: TextInput.Password
            placeholderText: i18n("Your password")
            Layout.fillWidth: true
        }

        QQC2.TextField {
            id: domainField
            Kirigami.FormData.label: i18n("Domain:")
            placeholderText: i18n("Optional (auto-detected if empty)")
            Layout.fillWidth: true
        }

        QQC2.SpinBox {
            id: pollIntervalSpin
            Kirigami.FormData.label: i18n("Poll Interval (seconds):")
            from: 10
            to: 600
            stepSize: 10
        }

        Item {
            Kirigami.FormData.isSection: true
        }

        RowLayout {
            Kirigami.FormData.label: i18n("Connection Test:")

            QQC2.Button {
                text: i18n("Test Credentials")
                icon.name: "network-connect"
                onClicked: {
                    statusLabel.text = i18n("Testing connection...");
                    statusLabel.color = Kirigami.Theme.textColor;
                    var dom = (domainField.text || "").trim();
                    FattoClient.login(serverUrlField.text, usernameField.text, passwordField.text, dom, function(err, data) {
                        if (err) {
                            statusLabel.text = i18n("Error: %1", err.message);
                            statusLabel.color = Kirigami.Theme.negativeTextColor;
                        } else if (data && data.requires_domain_choice) {
                            var domains = data.domains || [];
                            var chosen = domains.indexOf("pig") !== -1 ? "pig" : (domains[0] || "");
                            domainField.text = chosen;
                            statusLabel.text = i18n("Domain choice required (%1). Retrying with '%2'...", domains.join(", "), chosen);
                            FattoClient.login(serverUrlField.text, usernameField.text, passwordField.text, chosen, function(err2, data2) {
                                if (err2) {
                                    statusLabel.text = i18n("Error: %1", err2.message);
                                    statusLabel.color = Kirigami.Theme.negativeTextColor;
                                } else {
                                    var displayName = (data2.user && (data2.user.username || data2.user.id)) || data2.username || data2.id || "";
                                    statusLabel.text = i18n("Success! Connected as %1 (domain: %2)", displayName, chosen);
                                    statusLabel.color = Kirigami.Theme.positiveTextColor;
                                }
                            });
                        } else {
                            var displayName = (data && data.user && (data.user.username || data.user.id)) || (data && data.username) || (data && data.id) || "";
                            statusLabel.text = i18n("Success! Connected as %1", displayName);
                            statusLabel.color = Kirigami.Theme.positiveTextColor;
                        }
                    });
                }
            }

            QQC2.Label {
                id: statusLabel
                text: ""
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }
        }
    }
}
