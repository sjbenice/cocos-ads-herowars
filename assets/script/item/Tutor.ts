import { _decorator, Color, Component, Graphics, instantiate, lerp, Node, randomRangeInt, Sprite, sys, UITransform, v3, Vec3 } from 'cc';
import super_html_playable from '../super_html_playable';
const { ccclass, property } = _decorator;

@ccclass('Tutor')
export class Tutor extends Component {
    @property(Node)
    circleNode:Node = null;

    @property(Node)
    pointNode:Node = null;

    protected _startTimer:number = 0;
    protected _period:number = 1500;// milliseconds

    protected _length:number = 0;
    protected _tempLocalPos:Vec3 = Vec3.ZERO.clone();
    protected _tempLocalPos2:Vec3 = Vec3.ZERO.clone();
    protected _tutorOrigin:Vec3 = Vec3.ZERO.clone();

    protected _graphics:Graphics = null;
    protected _maskColor:Color = new Color(0, 0, 0, 128);

    protected _isFirst:boolean = true;
    protected _isTutorShowing:boolean = false;

    protected _pointDistance:number = 0;
    protected _trackIndex:number = 0;
    protected _uiTransform:UITransform = null;

    protected onLoad(): void {
        this._uiTransform = this.getComponent(UITransform);        
    }

    start() {
        if (!this.circleNode)
            this.circleNode = this.node.children[0];

        if (!this.pointNode)
            this.pointNode = this.node.children[1];

        this._pointDistance = this.pointNode.getComponent(UITransform).width * 4;
        
        this._graphics = this.node.addComponent(Graphics);
        this._graphics.fillColor = this._maskColor;
        this._graphics.strokeColor = Color.WHITE;
    }

    hideTutor() {
        if (this._isTutorShowing) {
            this.unscheduleAllCallbacks();
            this.resetPoints(true);
            this._isTutorShowing = false;
        }
    }

    showTutor(width:number, height:number, worldPos:Vec3) {
        const maskSize:number = 30;
        const tutorSize:number = 2;
        this._length = width * tutorSize;

        this.hideTutor();

        if (!this._isTutorShowing) {
            this._isTutorShowing = true;

            // this.resetPoints(true);
            this._uiTransform.convertToNodeSpaceAR(worldPos, this._tutorOrigin);

            this.scheduleOnce(()=>{
                this._graphics.markForUpdateRenderData();

                const left = this._tutorOrigin.x - width / 2, top = this._tutorOrigin.y + height / 2;
                this._graphics.fillRect(left, top, width * (tutorSize + 1), height * maskSize);
                this._graphics.fillRect(left, top - height * (maskSize + 1), width * (tutorSize + 1), height * maskSize);

                this._graphics.fillRect(left - width * maskSize, top - (height + 1) * maskSize, width * maskSize, height * (maskSize * 2 + 1));
                this._graphics.fillRect(left + width * (tutorSize + 1), top - (height + 1) * maskSize, width * maskSize, height * (maskSize * 2 + 1));

                this._startTimer = sys.now();

                // To avoid Cocos Graphics's render bug to prompt reget shape!
                this._tutorOrigin.set(this.node.position);
                this._tempLocalPos2.set(this._tutorOrigin);
                this._tempLocalPos2.x += 1;
                this.node.setPosition(this._tempLocalPos2);
                this.node.setPosition(this._tutorOrigin);
            }, this._isFirst ? 0.5 : 2);

            if (this._isFirst)
                super_html_playable.track_gtag('tutorialStart');

            this._isFirst = false;
        }
    }

    public hideTrack() {
        this.node.children.forEach(element => {
            element.active = false;
        });
        this._trackIndex = 0;
    }

    public updateMouseTrack(worldPos:Vec3, isEnd:boolean) {
        if (this._uiTransform) {
            this._uiTransform.convertToNodeSpaceAR(worldPos, this._tempLocalPos);
            this.showCircle(this._tempLocalPos);

            for (let index = this._trackIndex + 1; index < this.node.children.length; index++) {
                const element = this.node.children[index];
                element.active = false;
            }

            const startPos = this._trackIndex <= 0 ? Vec3.ZERO : this.node.children[this._trackIndex].position;
            this._tempLocalPos.subtract(startPos);
            const radian:number = Math.atan2(this._tempLocalPos.y, this._tempLocalPos.x);

            let pointIndex : number = this._trackIndex;
            let length = this._tempLocalPos.length();

            if (isEnd) {
                length -= this._pointDistance;
            }
            for (let index = this._pointDistance; index < length; index += this._pointDistance) {
                this._tempLocalPos.x = startPos.x + Math.cos(radian) * index;
                this._tempLocalPos.y = startPos.y + Math.sin(radian) * index;
                this.showPoint(pointIndex ++, this._tempLocalPos);
            }
            if (isEnd) {
                this.showPoint(pointIndex ++, this.circleNode.position);
                this._trackIndex = pointIndex;
            }
        }
    }

    protected resetPoints(clearGraphics:boolean) {
        this.hideTrack();

        if (clearGraphics) {
            this._graphics.clear();
        }

        this._startTimer = 0;
    }

    update(deltaTime: number) {
        if (this._isTutorShowing && this._startTimer > 0) {
            let elapsedTime = sys.now() - this._startTimer;
            if (elapsedTime > this._period)
                elapsedTime = this._period;

            this._tempLocalPos.set(Vec3.ZERO);
            this._tempLocalPos.x = this._length * elapsedTime / this._period;

            this.showCircle(this._tempLocalPos);

            let pointIndex: number = Math.floor(this._tempLocalPos.x / this._pointDistance);
            this.showPoint(pointIndex, this._tempLocalPos);

            if (elapsedTime >= this._period) {
                this.resetPoints(false);
                this._startTimer = sys.now();
            }
        }
    }

    protected showCircle(localPos:Vec3) {
        if (this.circleNode) {
            this.circleNode.setPosition(localPos);
            this.circleNode.active = true;
        }
    }

    protected showPoint(pointIndex:number, localPos:Vec3) {
        while (pointIndex + 1 >= this.node.children.length) {
            const node = instantiate(this.pointNode);
            this.node.addChild(node);
        }

        const pointNode = this.node.children[pointIndex + 1];
        pointNode.setPosition(localPos);
        pointNode.active = true;
    }
}
