import { _decorator, Camera, Canvas, Component, lerp, Rect, Node, find, UITransform, Size, NodeEventType, Vec3, v3, math, view, tween } from "cc";
import { Utils } from "../util/Utils";
import { Player } from "./Player";
import super_html_playable from "../super_html_playable";
import { SoundMgr } from "../manager/SoundMgr";
import { GameMgr } from "../manager/GameMgr";

const { ccclass, property } = _decorator;

@ccclass
export default class GameCamera extends Component {
    @property
    follow:boolean = true;

    @property(Canvas)
    canvas:Canvas = null;

    @property(Node)
    startNode: Node = null;

    public static TIME_WORM:number = 3;

    @property(Player)
    player:Player = null;

    @property
    followSpeed: number = 5;

    @property
    zoomSpeed: number = 1;

    @property(Camera)
    camera: Camera = null;

    protected _canvasSize : Size;
    protected _maxHalfDimension: Size = Size.ZERO.clone();

    protected _targetZoom:number = 0;
    protected _calcPos:Vec3 = Vec3.ZERO.clone();
    protected _targetPos:Vec3 = Vec3.ZERO.clone();
    protected _zooming: boolean = true;
    protected _distance:Vec3 = Vec3.ZERO.clone();

    protected _followPos:Vec3 = v3(640, 360);
    protected _followLength:number = 720;
    protected _orgOrthoHeight:number = 0;
    protected _startFollow: boolean = false;
    protected _isFollowFinished: boolean = false;
    protected _isStartEffect: boolean = true;

    protected _canvasUITransform:UITransform = null;

    onLoad() {
        if (!this.camera) {
            this.camera = this.getComponent(Camera);
        }

        if (!this.canvas)
            this.canvas = find('Canvas').getComponent(Canvas);
        
        this._orgOrthoHeight = this.camera.orthoHeight;
        this._maxHalfDimension.set(this.camera.node.position.x, this.camera.node.position.y);

        this._canvasUITransform = this.canvas.getComponent(UITransform);
        this._canvasSize = this._canvasUITransform.contentSize;

        this.canvas.node.on(NodeEventType.TRANSFORM_CHANGED, this.recaclParams, this);
    }

    protected start(): void {
        if (this.startNode) {
            const size: Size = Utils.calcUIRenderSize(this.startNode);
            this._followLength = size.x;

            this.startNode.getWorldPosition(this._targetPos);
            this.calcLocalPos(this._targetPos, this._followLength, this._followPos);

        }

        this.recaclParams();

        this._isStartEffect = super_html_playable.version() != GameMgr.VERSION.FIRST_TAP_NO_INTRO;
    }

    protected onDestroy(): void {
        if (this.canvas)
            this.canvas.node.off(NodeEventType.TRANSFORM_CHANGED, this.recaclParams, this);
    }

    protected recaclParams() {
        this.calcZoom(this._followLength);
        this.calcWorldPos(this._followPos);

        this.followTarget(-1);
        this.adjustZoom(-1);
    }
    
    protected calcZoom(needLength:number) : number {
        let targetZoom : number = 0;
        needLength /= 2;

        if (this._canvasSize.width > this._canvasSize.height) {
            const limitZoom = Math.min(this._orgOrthoHeight, this._maxHalfDimension.width / this._canvasSize.width * this._canvasSize.height);
            targetZoom = Math.min(needLength, limitZoom);
            needLength = targetZoom;
        } else {
            targetZoom = needLength / this._canvasSize.width * this._canvasSize.height;
        }

        if (this._targetZoom != targetZoom) {
            this._targetZoom = targetZoom;
            this._zooming = true;
        }

        needLength *= 2;

        return needLength;
    }

    protected calcWorldPos(localPos:Vec3) {
        this._calcPos.set(localPos.x + this._canvasSize.width / 2 - this._maxHalfDimension.width,
            localPos.y + this._canvasSize.height / 2 - this._maxHalfDimension.height);
        
        this._targetPos.set(this._calcPos);
    }

    protected calcLocalPos(worldPos:Vec3, length:number, outPos:Vec3) {
        outPos.set(worldPos.x - this._canvasSize.width / 2 + this._maxHalfDimension.width,
            worldPos.y - this._canvasSize.height / 2 + this._maxHalfDimension.height);

        if (this._canvasSize.width > this._canvasSize.height) {
            length = length / this._canvasSize.height * this._canvasSize.width / 2;
            if (outPos.x - length < 0) {
                outPos.x = length;
                this.calcWorldPos(outPos);
            }
            if (outPos.x + length > this._maxHalfDimension.width * 2) {
                outPos.x = -length + this._maxHalfDimension.width * 2;
                this.calcWorldPos(outPos);
            }
        }
    }

    lateUpdate(dt: number) {
        if (this.follow){
            if (this._startFollow && this.player) {
                this._followLength = this.player.getFollowParams(this._targetPos);
                this._followLength = this.calcZoom(this._followLength);
                this.calcLocalPos(this._targetPos, this._followLength, this._followPos);
            }
            this._isFollowFinished = this.followTarget(dt);
            if (this._zooming) {
                this.adjustZoom(dt);
            }
        }

        if (this._isStartEffect) {
            this._isStartEffect = false;
            SoundMgr.playWorm(true);
            tween(this.startNode)
            .delay(GameCamera.TIME_WORM / 2)
            .by(GameCamera.TIME_WORM / 2, {position:v3(-200,0,0)})
            .by(GameCamera.TIME_WORM / 4, {position:v3(200,0,0)})
            .call(()=>{
                this._startFollow = true;
            })
            .start();
        }
    }

    // public isFollowFinished() :boolean {
    //     return this._isFollowFinished;
    // }

    private followTarget(dt: number) : boolean {
        let ret : boolean = true;

        if (this.follow) {
            ret = this._distance.set(this._targetPos).subtract(this.camera.node.position).lengthSqr() < 0.1;
            this.camera.node.position = dt > 0 ? this.camera.node.position.lerp(this._targetPos, dt * this.followSpeed) : this._targetPos;
        }

        return ret;
    }

    private adjustZoom(dt: number) {
        if (this.follow) {
            let zoom = dt > 0 ? lerp(this.camera.orthoHeight, this._targetZoom, dt * this.zoomSpeed) : this._targetZoom;
            
            this.camera.orthoHeight = zoom;
            if (Math.abs(zoom - this._targetZoom) < 0.1){
                this.camera.orthoHeight = this._targetZoom;
                this._zooming = false;
            }
        }
    }

    getWorldPosFromUI(uiPos:Vec3, outPos:Vec3) {
        if (this.camera){
            // this.camera.screenToWorld(uiPos, outPos);// BUG

            // Get the viewport size
            const viewportSize = view.getVisibleSize();

            // Calculate the camera's ortho height
            const cameraOrthoHeight = this.camera.orthoHeight;
            
            // Calculate the aspect ratio
            const aspectRatio = viewportSize.width / viewportSize.height;
            
            this.camera.node.getWorldPosition(outPos);

            // Calculate the world position
            outPos.x += (uiPos.x / viewportSize.width - 0.5) * aspectRatio * cameraOrthoHeight * 2;
            outPos.y += (uiPos.y / viewportSize.height - 0.5) * cameraOrthoHeight * 2;
        }
    }
}
