import {Controller} from "../Controller.js";
import {TreeViewPlugin} from "@xeokit/xeokit-sdk/src/plugins/TreeViewPlugin/TreeViewPlugin.js";
import {TreeViewContextMenu} from "../contextMenus/TreeViewContextMenu.js";

/** @private */
class ClassesExplorer extends Controller {

    constructor(parent, cfg = {}) {

        super(parent);

        if (!cfg.classesTabElement) {
            throw "Missing config: classesTabElement";
        }

        if (!cfg.showAllClassesButtonElement) {
            throw "Missing config: showAllClassesButtonElement";
        }

        if (!cfg.hideAllClassesButtonElement) {
            throw "Missing config: hideAllClassesButtonElement";
        }

        if (!cfg.classesElement) {
            throw "Missing config: classesElement";
        }

        this._classesTabElement = cfg.classesTabElement;
        this._showAllClassesButtonElement = cfg.showAllClassesButtonElement;
        this._hideAllClassesButtonElement = cfg.hideAllClassesButtonElement;
        this._classesTabButtonElement = this._classesTabElement.querySelector(".xeokit-tab-btn");

        if (!this._classesTabButtonElement) {
            throw "Missing DOM element: xeokit-tab-btn";
        }

        const classesElement = cfg.classesElement;

        this._treeView = new TreeViewPlugin(this.viewer, {
            containerElement: classesElement,
            hierarchy: "types",
            autoAddModels: false
        });

        this._treeViewContextMenu = new TreeViewContextMenu();

        this._treeView.on("contextmenu", (e) => {
            this._treeViewContextMenu.context = {
                viewer: e.viewer,
                treeViewPlugin: e.treeViewPlugin,
                treeViewNode: e.treeViewNode
            };
            this._treeViewContextMenu.show(e.event.pageX, e.event.pageY);
        });

        // Left-clicking on a tree node isolates that object in the 3D view

        this._treeView.on("nodeTitleClicked", (e) => {
            const scene = this.viewer.scene;
            const objectIds = [];
            e.treeViewPlugin.withNodeTree(e.treeViewNode, (treeViewNode) => {
                if (treeViewNode.objectId) {
                    objectIds.push(treeViewNode.objectId);
                }
            });
            scene.setObjectsXRayed(scene.objectIds, true);
            scene.setObjectsVisible(scene.objectIds, true);
            scene.setObjectsXRayed(objectIds, false);
            scene.setObjectsSelected(scene.selectedObjectIds, false);
            this.viewer.cameraFlight.flyTo({
                aabb: scene.getAABB(objectIds),
                duration: 0.5
            }, () => {
                setTimeout(function () {
                    scene.setObjectsVisible(scene.xrayedObjectIds, false);
                    scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                }, 500);
            });
        });

        this._onModelLoaded = this.viewer.scene.on("modelLoaded", (modelId) =>{
            if (this.viewer.metaScene.metaModels[modelId]) {
                const modelInfo = this.bimViewer._modelsExplorer.getModelInfo(modelId);
                if (!modelInfo) {
                    return;
                }
                this._treeView.addModel(modelId, {
                    rootName: modelInfo.name
                });
            }
        });

        this._onModelUnloaded = this.viewer.scene.on("modelUnloaded", (modelId) => {
            if (this.viewer.metaScene.metaModels[modelId]) {
                this._treeView.removeModel(modelId);
            }
        });

        this.bimViewer.on("reset", () => {
            this._treeView.collapse();
        });
    }

    setEnabled(enabled) {
        if (!enabled) {
            this._classesTabButtonElement.classList.add("disabled");
            this._showAllClassesButtonElement.classList.add("disabled");
            this._hideAllClassesButtonElement.classList.add("disabled");
        } else {
            this._classesTabButtonElement.classList.remove("disabled");
            this._showAllClassesButtonElement.classList.remove("disabled");
            this._hideAllClassesButtonElement.classList.remove("disabled");
        }
    }

    showNodeInTreeView(objectId) {
        this._treeView.collapse();
        this._treeView.showNode(objectId);
    }

    unShowNodeInTreeView() {
        this._treeView.unShowNode();
    }

    destroy() {
        super.destroy();
        this._treeView.destroy();
        this._treeViewContextMenu.destroy();
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onModelUnloaded);
    }
}

export {ClassesExplorer};