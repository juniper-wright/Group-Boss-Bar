import {Socket} from "./lib/socket.js";

export class GroupBossBar {
    constructor() {
        this.actors;
        this.tokens;
        this.bgPath = game.settings.get("groupbossbar", "backgroundPath");
        this.fgPath = game.settings.get("groupbossbar", "foregroundPath");
        this.tempBarColor = game.settings.get("groupbossbar", "tempBarColor");
        this.textSize = game.settings.get("groupbossbar", "textSize");
        this.position = game.settings.get("groupbossbar", "position");
    }

    static async create(tokens, render = true) {
        let instance = new GroupBossBar();
        instance.actors = tokens.map((token) => token.actor);
        instance.tokens = tokens;
        this.addGroupBossBar(instance);
        if (render) instance.draw(game.settings.get("groupbossbar", "barHeight"));
        if (game.user.isGM) {
            let oldBars = canvas.scene.getFlag("groupbossbar", "groupBossBarActive");
            if (Array.isArray(oldBars)) {
                oldBars.push(token.id);
            } else {
                oldBars = [token.id];
            }
            await canvas.scene.setFlag("groupbossbar", "groupBossBarActive", oldBars);
        }
        instance.hookId = Hooks.on("updateActor", (actor, updates) => {
            if (
                instance.actors.map((a) => a.id).includes(actor.id) &&
                foundry.utils.getProperty(updates.system, game.settings.get("groupbossbar", "currentHpPath")) !== undefined
            ) {
                instance.update();
            }
        });

        instance.CTHook = Hooks.on("renderCombatTracker", (app, html, data) => {
            instance.CCTSetPosition();
        });
        instance.CCTHook = Hooks.on("combatDock:playIntroAnimation:finished", (app, html, data) => {
            instance.CCTSetPosition(0);
        });
        instance.CCTCloseHook = Hooks.on("closeCombatDock", (app, html, data) => {
            instance.CCTSetPosition();
        });
      instance.injectHtml();
        return instance;
    }

    CCTSetPosition(delay = 0) {
        setTimeout(() => {
            try {
                const combatDockElement = document.getElementById("combat-dock");
                const spacer = document.querySelector(".groupBossBarSpacer");
                if (!spacer) return;
                spacer.style.setProperty("height", "0px");
                const spacerDistanceFromTop = spacer.getBoundingClientRect().top;
                if (!combatDockElement || combatDockElement.classList.contains("hidden")) {
                    spacer.style.setProperty("height", "0px");
                    return;
                }
                const height = combatDockElement.offsetHeight - spacerDistanceFromTop;
                spacer.style.setProperty("height", `${height * 0.8}px`);
            } catch (error) {}
        }, delay);
    }

    draw(h) {
        if ($("body").find(`div[id="groupBossBar-${this.id}"]`).length > 0) return; //#navigation
        let groupBossBarContainer = `<div id="groupBossBarContainer"></div>`;
        let groupBossBarHtml = `<div class="groupBossBarSpacer" style="transition: height 0.3s ease-in-out; flex-basis: 100%;height: 0px;" id="groupBossBarSpacer-${this.id}"></div><div id="groupBossBar-${this.id}" class="groupBossBar">
    <a class="groupBossBarName" style="font-size: ${this.textSize}px;">${this.name}</a>
    <div id ="groupBossBarBar-${this.id}" style="z-index: 1000;">
      <div id="groupBossBarMax-${this.id}" class="groupBossBarMax" style="background-image:url('${this.bgPath}');height:${h}px;"></div>
      <div id="groupBossBarTemp-${this.id}" class="groupBossBarTemp" style="background-color:${this.tempBarColor};height:${h}px;width:${this.hpPercent}%"></div>
      <div id="groupBossBarCurrent-${this.id}" class="groupBossBarCurrent" style="background-image:url('${this.fgPath}');height:${h}px;width:${this.hpPercent}%"></div>
    </div>
  </div>
  <div style="flex-basis: 100%;height: ${this.textSize + 3}px;" id ="groupBossBarSpacer-${this.id}"></div>
  `;
        this.html = $(groupBossBarHtml);
        this.injectHtml();
    }

    injectHtml() {
        const groupBossBarHtml = this.html;
        switch (this.position) {
            case 0:
                $("#ui-top").append(groupBossBarHtml);
                break;
            case 1:
                const cameraContainerW = $("#camera-views").width();
                if ($("#groupBossBarContainer").length == 0) {
                    const wrapper = $("<div id='groupBossBarContainer'></div>");
                    wrapper.append(groupBossBarHtml);
                    $("#ui-bottom").prepend(wrapper);
                }
                $("#groupBossBarContainer").append(groupBossBarHtml);
                $("#groupBossBarContainer").css({
                    position: "fixed",
                    bottom: $("#hotbar").outerHeight(true) + $(".groupBossBar").outerHeight(true) + 10,
                    width: `calc(94% - 330px - ${cameraContainerW}px)`,
                    margin: "1rem 3%",
                    left: 15 + cameraContainerW,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                });
                break;
            default:
                $("#ui-top").append(groupBossBarHtml);
        }

        this.update();
    }

    update() {
        const isBar = document.getElementById(`groupBossBarCurrent-${this.id}`);
        if (!isBar) return;
        document.getElementById(`groupBossBarCurrent-${this.id}`).style.setProperty("width", `${this.hpPercent}%`);
        document.getElementById(`groupBossBarTemp-${this.id}`).style.setProperty("width", `${this.hpPercent}%`);
        this.CCTSetPosition();
    }

    clear() {
        $("body").find(`div[id="groupBossBar-${this.id}"]`).remove();
    }

    async destroy() {
        const flag = canvas.scene.getFlag("groupbossbar", "groupBossBarActive");
        let newFlag = [];
        for (let id of flag) {
            if (id == this.token.id) continue;
            newFlag.push(id);
        }
        await canvas.scene.setFlag("groupbossbar", "groupBossBarActive", newFlag);
        this.unHook();
    }

    static clearAll() {
        if (!canvas.scene._groupBossBars) return;
        for (let bar of Object.entries(canvas.scene._groupBossBars)) {
            $("body").find(`div[id="groupBossBar-${bar[1].id}"]`).remove();
            $("body").find(`div[id="groupBossBarSpacer-${bar[1].id}"]`).remove();
        }
    }

    static async remove() {
      await canvas.scene.unsetFlag("groupbossbar", "groupBossBarActive");
      Object.values(canvas.scene._groupBossBars).forEach((bar) => bar.unHook());
        canvas.scene._groupBossBars = {};
    }

    unHook() {
        Hooks.off("updateActor", this.hookId);
        Hooks.off("renderCombatTracker", this.CTHook);
        Hooks.off("renderCombatDock", this.CCTHook);
        Hooks.off("closeCombatDock", this.CCTCloseHook);
        this.clear();
    }

    static addGroupBossBar(groupBossBar) {
        if (!canvas.scene._groupBossBars) {
            canvas.scene._groupBossBars = {};
        }
        canvas.scene._groupBossBars[groupBossBar.id] = groupBossBar;
    }

    static cameraPan({tokenId, scale, duration}) {
        const token = canvas.tokens.get(tokenId);
        canvas.animatePan({
            x: token.center.x,
            y: token.center.y,
            scale: scale,
            duration: duration,
        });
    }

    static panCamera(token, scale = 1.8, duration = 1000) {
        Socket.cameraPan({tokenId: token.id, scale: scale, duration: duration});
    }

    static async renderGroupBossBar() {
        if (canvas.scene) {
            GroupBossBar.clearAll();
            const ids = canvas.scene.getFlag("groupbossbar", "groupBossBarActive");
            if (!ids) return;
            for (let id of ids) {
                if (canvas.scene._groupBossBars && canvas.scene._groupBossBars[id]) {
                    canvas.scene._groupBossBars[id].draw(game.settings.get("groupbossbar", "barHeight"));
                } else {
                    await GroupBossBar.create(canvas.tokens.get(id));
                }
            }
        }
    }

    get currentHp() {
        return this.actors.reduce((acc, actor) => {
            acc += foundry.utils.getProperty(actor.system, game.settings.get("groupbossbar", "currentHpPath"));
            return acc;
        }, 0);
    }

    get maxHp() {
        return this.actors.reduce((acc, actor) => {
            acc += foundry.utils.getProperty(actor.system, game.settings.get("groupbossbar", "maxHpPath"));
            return acc;
        }, 0);
    }

    get hpPercent() {
        return Math.max(0, Math.round((100 * this.currentHp) / this.maxHp));
    }

    get hpPercentAsString() {
        return String(this.hpPercent);
    }

    get name() {
        return this.token.document.name;
    }

    get id() {
        return this.token.id;
    }
}
