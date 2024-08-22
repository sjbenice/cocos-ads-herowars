import { _decorator, Component, Node, NodeEventType, Size, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AutoArrangeGrid')
export class AutoArrangeGrid extends Component {
    @property(UITransform)
    renderUI:UITransform = null;

    @property(Node)
    topItem:Node = null;

    @property(Node)
    botItem:Node = null;

    @property
    maxCols:number = 3;
    @property
    gap:number = 10;

    private initialSize: Size = Size.ZERO.clone();
    private _itemSize:Size = null;
    onLoad() {
        if (this.renderUI == null)
            this.renderUI = this.getComponent(UITransform);

        if (this.node.children.length > 0)
            this._itemSize = this.node.children[0].getComponent(UITransform).contentSize.clone();

        this.node.on(NodeEventType.TRANSFORM_CHANGED, this.arrangeChildren, this);

        this.arrangeChildren();
    }

    protected onDestroy(): void {
        if (this.node)
            this.node.off(NodeEventType.TRANSFORM_CHANGED, this.arrangeChildren, this);
    }

    arrangeChildren() {
        if (this.renderUI && this._itemSize && !this.initialSize.equals(this.renderUI.contentSize)) {
            // console.log(`Canvas resized: width = ${this.renderUI.width}, height = ${this.renderUI.height}`);

            const renderDimen = this.renderUI.contentSize;
            this.initialSize.set(renderDimen);
            
            let rows, cols;
            if (renderDimen.width > renderDimen.height) {
                rows = 2;
                cols = 3;
            } else {
                rows = 3;
                cols = 2;
            }

            const horzScale = (renderDimen.width - this.gap * (cols - 1)) / (this._itemSize.width * cols);
            const vertScale = (renderDimen.height - this.gap * (rows - 1)) / (this._itemSize.height * rows);
            const scale = Math.min(horzScale, vertScale);
            const itemWidth = this._itemSize.width * scale;
            const itemHeight = this._itemSize.height * scale;
            const internalHeight = itemHeight * rows + this.gap * (rows - 1);
            const left = - (itemWidth * cols + this.gap * (cols - 1)) / 2 + itemWidth / 2;
            const top = (this.botItem ? renderDimen.height / 2 : internalHeight / 2) - itemHeight / 2;
            const vec3scale = Vec3.ONE.clone();
            vec3scale.multiplyScalar(scale);
            const pos = Vec3.ZERO.clone();

            for (let index = 0; index < this.node.children.length; index++) {
                const element = this.node.children[index];
                element.setScale(vec3scale);
                pos.x = left + (index % cols) * (itemWidth + this.gap);
                pos.y = top - Math.floor(index / cols) * (itemHeight + this.gap);
                element.setPosition(pos);
            }

            if (this.botItem) {
                const pos = this.node.getPosition();
                pos.y += renderDimen.height / 2 - internalHeight - this.botItem.getComponent(UITransform).height * 0.8;

                this.botItem.setPosition(pos);
            }
        }
    }
}


