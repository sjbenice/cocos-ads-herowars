import { _decorator, Component, Node, Rect, Size, tween, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Utils')
export class Utils {
    public static lerp(start: number, end: number, t: number): number {
        return start + t * (end - start);
    }

    public static lerpVec3(start: Vec3, end: Vec3, t: number): Vec3 {
        return v3(Utils.lerp(start.x, end.x, t), Utils.lerp(start.y, end.y, t), Utils.lerp(start.z, end.z, t));
    }

    public static parabola(t: number, startY: number, endY: number, height: number): number {
        const peak = height + Math.max(startY, endY);
        const a = startY - 2 * peak + endY;
        const b = 2 * (peak - startY);
        const c = startY;
        return a * t ** 2 + b * t + c;
    }

    public static removeChildrenDestroy(node:Node) : void {
        // node.removeAllChildren();
        for (let index = node.children.length - 1; index >= 0; index--) {
            const element = node.children[index];
            element.removeFromParent();
            element.destroy();
        }
    }

    // http://yourdomain.com/playableAd/index.html?version=1
    public static getUrlParameter(name: string): string {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    public static addComponentIfNot(node:Node, component:any){
        let com = node.getComponent(component);
        if (!com)
            com = node.addComponent(component);

        return com;
    }

    public static calcUIRenderSize(node:Node) : Size {
        if (node) {
            const uiTransform : UITransform = node.getComponent(UITransform);
            const ret:Size = uiTransform.contentSize.clone();
            ret.width *= node.scale.x;
            ret.height *= node.scale.y;

            return ret;
        }

        return null;
    }

    public static isWorldPosInUINodeRect(worldPos: Vec3, uiNode: Node): boolean {
        const uiTransform = uiNode.getComponent(UITransform);
        if (!uiTransform) return false;

        // Get the node's world bounding box
        const boundingBox = uiTransform.getBoundingBoxToWorld();

        return boundingBox.x <= worldPos.x && worldPos.x < boundingBox.x + boundingBox.width &&
            boundingBox.y <= worldPos.y && worldPos.y < boundingBox.y + boundingBox.height;
    }
}


