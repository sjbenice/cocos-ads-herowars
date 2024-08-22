import { _decorator, Component, Node, NodeEventType, Size, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MonstrousArrange')
export class MonstrousArrange extends Component {
    @property(UITransform)
    renderUI:UITransform = null;
    @property
    isLeft:boolean = true;

    margin: number = 20;

    private initialSize: Size = Size.ZERO.clone();
    private itemSize: Size = Size.ZERO.clone();
    protected _orgScale:Vec3 = null;

    onLoad() {
        if (this.renderUI == null)
            this.renderUI = this.node.parent.getComponent(UITransform);

        this._orgScale = this.node.scale.clone();

        this.node.parent.on(NodeEventType.TRANSFORM_CHANGED, this.adjustPosition, this);

        this.itemSize.set(this.getComponent(UITransform).contentSize);
        this.itemSize.width *= this._orgScale.x;
        this.itemSize.height *= this._orgScale.y;

        this.adjustPosition();
    }

    protected onDestroy(): void {
        if (this.node && this.node.parent)
            this.node.parent.off(NodeEventType.TRANSFORM_CHANGED, this.adjustPosition, this);
    }

    adjustPosition(force:boolean = false) {
        if (this.renderUI) {
            // Check if the size has changed
            if (force || !this.initialSize.equals(this.renderUI.contentSize)) {
                // console.log(`Canvas resized: width = ${this.renderUI.width}, height = ${this.renderUI.height}`);

                const renderDimen = this.renderUI.contentSize;
                this.initialSize.set(renderDimen);

                let x:number = -renderDimen.width / 2 + this.margin + this.itemSize.width / 2;
                if (!this.isLeft)
                    x *= -1;

                let y = -renderDimen.height / 2 + this.margin + this.itemSize.height / 2;

                if (renderDimen.width < renderDimen.height) {
                    y += this.margin * 4;
                    if (this.isLeft)
                        x -= this.itemSize.width / 4;
                    else
                        x += this.itemSize.width / 4;
                    
                    const newScale = this._orgScale.clone();
                    newScale.multiplyScalar(0.5);
                    this.node.setScale(newScale);
                } else {
                    y += this.margin;
                    this.node.setScale(this._orgScale);
                }

                this.node.setPosition(v3(x, y, 0));
            }
        }
    }
}