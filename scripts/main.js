import { GroupBossBar } from "./GroupBossBar.js";
import { Socket } from "./lib/socket.js";

export const MODULE_ID = "groupbossbar";

Hooks.once("ready", function () {

    ui.GroupBossBar = GroupBossBar;

    Socket.register("cameraPan", GroupBossBar.cameraPan);

    game.settings.register("groupbossbar", "currentHpPath", {
        name: game.i18n.localize("groupbossbar.settings.currentHpPath.name"),
        hint: game.i18n.localize("groupbossbar.settings.currentHpPath.hint"),
        scope: "world",
        config: true,
        type: String,
        default: "attributes.hp.value",
    });

    game.settings.register("groupbossbar", "maxHpPath", {
        name: game.i18n.localize("groupbossbar.settings.maxHpPath.name"),
        hint: game.i18n.localize("groupbossbar.settings.maxHpPath.hint"),
        scope: "world",
        config: true,
        type: String,
        default: "attributes.hp.max",
    });

    game.settings.register("groupbossbar", "barHeight", {
        name: game.i18n.localize("groupbossbar.settings.barHeight.name"),
        hint: game.i18n.localize("groupbossbar.settings.barHeight.hint"),
        scope: "world",
        config: true,
        type: Number,
        default: 20,
    });

    game.settings.register("groupbossbar", "textSize", {
        name: game.i18n.localize("groupbossbar.settings.textSize.name"),
        hint: game.i18n.localize("groupbossbar.settings.textSize.hint"),
        scope: "world",
        config: true,
        type: Number,
        default: 20,
    });

    game.settings.register("groupbossbar", "cameraPan", {
        name: game.i18n.localize("groupbossbar.settings.cameraPan.name"),
        hint: game.i18n.localize("groupbossbar.settings.cameraPan.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register("groupbossbar", "position", {
        name: game.i18n.localize("groupbossbar.settings.position.name"),
        hint: game.i18n.localize("groupbossbar.settings.position.hint"),
        scope: "world",
        config: true,
        type: Number,
        choices: {
            0: game.i18n.localize("groupbossbar.settings.position.opt0"),
            1: game.i18n.localize("groupbossbar.settings.position.opt1"),
        },
        default: 0,
    });

    game.settings.register("groupbossbar", "backgroundPath", {
        name: game.i18n.localize("groupbossbar.settings.backgroundPath.name"),
        hint: game.i18n.localize("groupbossbar.settings.backgroundPath.hint"),
        scope: "world",
        config: true,
        type: String,
        default: "modules/groupbossbar/resources/Dark.webp",
        filePicker: true,
    });

    game.settings.register("groupbossbar", "foregroundPath", {
        name: game.i18n.localize("groupbossbar.settings.foregroundPath.name"),
        hint: game.i18n.localize("groupbossbar.settings.foregroundPath.hint"),
        scope: "world",
        config: true,
        type: String,
        default: "modules/groupbossbar/resources/Blood.webp",
        filePicker: true,
    });

    game.settings.register("groupbossbar", "tempBarColor", {
        name: game.i18n.localize("groupbossbar.settings.tempBarColor.name"),
        hint: game.i18n.localize("groupbossbar.settings.tempBarColor.hint"),
        scope: "world",
        config: true,
        type: String,
        default: "#7e7e7e",
    });

    Hooks.on("renderApplication", (app) => {
        if (app.id == "controls" || app.id == "navigation" || app.id == "camera-views") {
            BossBar.renderBossBar();
        }
    });
    BossBar.renderBossBar();
});

Hooks.once("ready", function () {});

Hooks.on("updateScene", async (scene, updates) => {
    if (!game.user.isGM) {
        if (updates.flags?.groupbossbar) {
            const ids = canvas.scene.getFlag("groupbossbar", "bossBarActive");
            if (!ids) {
                if (canvas.scene._bossBars) {
                    for (let bar of Object.entries(canvas.scene._bossBars)) {
                        bar[1].unHook();
                    }
                    delete canvas.scene._bossBars;
                }
                return;
            }
            for (let id of ids) {
                if (canvas.scene._bossBars && canvas.scene._bossBars[id]) {
                    canvas.scene._bossBars[id].draw(game.settings.get("groupbossbar", "barHeight"));
                    return;
                } else {
                    await BossBar.create(canvas.tokens.get(id));
                }
            }
        } else {
            //BossBar.clearAll();
        }
    }
});

Hooks.on("getSceneControlButtons", (controls, b, c) => {
    if (!canvas.scene) return;
    let isBoss = canvas.scene.getFlag("groupbossbar", "bossBarActive") ? true : false;
    controls
        .find((c) => c.name == "token")
        .tools.push({
            name: "groupBossBar",
            title: game.i18n.localize("groupbossbar.controls.bossUI.name"),
            icon: "fas fa-locust",
            toggle: true,
            visible: game.user.isGM,
            active: isBoss,
            onClick: async (toggle) => {
                if (toggle) {
                    if (canvas.tokens.controlled[0]) {
                        await BossBar.create(canvas.tokens.controlled);
                    } else {
                        ui.notifications.warn(game.i18n.localize("groupbossbar.controls.bossUI.warn"));
                    }
                } else {
                    BossBar.remove();
                }
            },
        });
});
