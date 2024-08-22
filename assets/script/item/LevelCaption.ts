import { _decorator, Color, Component, Label, Node, Size, Sprite, tween, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LevelCaption')
export class LevelCaption extends Component {
    public static TYPE = {
        PLAYER:0,
        ENEMY:1,
        LOOT:2,
    };

    @property(Label)
    levelLabel:Label = null;
    @property(Sprite)
    levelBg:Sprite = null;

    protected _level:number = 0;
    protected _type:number = 0;

    protected _levelBgUITransform:UITransform = null;
    protected _levelBgContentSize:Size = null;

    protected static _zoom:number = 2;
    protected _zoomScale:Vec3 = null;
    protected _orgScale:Vec3 = null;

    protected start(): void {
        this._orgScale = this.node.scale.clone();
        this._zoomScale = this.node.scale.clone();
        this._zoomScale.multiplyScalar(LevelCaption._zoom);
    }

    public getLevel() {
        return this._level;
    }

    public setLevel(level:number, type:number) {
        this._level = level;
        this._type = type;

        if (this.levelLabel)
            this.levelLabel.string = type == LevelCaption.TYPE.LOOT ? ("x" + level.toString()) : level.toString();

        if (this.levelBg) {
            if (!this._levelBgUITransform) {
                this._levelBgUITransform = this.levelBg.getComponent(UITransform);
                this._levelBgContentSize = this._levelBgUITransform.contentSize.clone();
            }
            
            this.setBgColor(this.getBgColor(type));

            const length = this.levelLabel.string.length;
            this._levelBgContentSize.set(this._levelBgContentSize.y * (length/ 2 + 1), this._levelBgContentSize.y);
            this._levelBgUITransform.setContentSize(this._levelBgContentSize);
        }
    }

    protected getBgColor(type:number) {
        return type == LevelCaption.TYPE.ENEMY ? Color.RED : Color.BLUE;
    }

    public setBgColor(color:Color) {
        if (this.levelBg)
            this.levelBg.color = color ? color : this.getBgColor(this._type);
    }

    public addLevel(value : number) {
        this.setLevel(this._level + value, this._type);

        tween(this.node)
        .to(0.2, {scale:this._zoomScale}, {easing:'quartIn'})
        .to(0.2, {scale:this._orgScale}, {easing:'quartIn'})
        .start();
    }
}

