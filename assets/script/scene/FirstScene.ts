import { _decorator, Button, Component, Node, Tween, tween, UITransform, v3, Vec2, Vec3 } from 'cc';
import super_html_playable from '../super_html_playable';
const { ccclass, property } = _decorator;


@ccclass('FirstScene')
export class FirstScene extends Component {
    @property(Node)
    background:Node;

    @property(Node)
    logo:Node;

    @property(Node)
    logoEffect:Node;

    @property(Node)
    playButton:Node;

    @property(Node)
    gotoButton:Node;

    onLoad() {
    }

    start() {
        if (this.logo)
            this.logo.active = false;
        if (this.logoEffect)
            this.logoEffect.active = false;
        if (this.playButton)
            this.playButton.active = false;
        if (this.gotoButton)
            this.gotoButton.active = false;

        if (super_html_playable.hideAllButton()) {
            this.playButton = null;
            this.gotoButton = null;
        }

        if (this.playButton) {
            this.playButton.active = true;
            this.playButton.setScale(Vec3.ZERO);
            tween(this.playButton)
            .to(1, {scale:Vec3.ONE}, {easing:'bounceInOut'})
            .start();

            tween(this.playButton)
                .delay(1)
                .to(0.5, { scale: v3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                .to(0.5, { scale: Vec3.ONE }, { easing: 'sineIn' })
                .union()
                .repeatForever()
                .start();
        }

        if (this.gotoButton) {
            this.gotoButton.active = true;
            this.gotoButton.setScale(Vec3.ZERO);
            tween(this.gotoButton)
            .to(0.3, {scale:Vec3.ONE}, {easing:'bounceOut'})
            .start();
        }
        
        if (this.logo) {
            this.logo.active = true;
            tween(this.logo)
            .to(0.1, {scale:v3(2, 2, 2)}, {easing:'cubicOut'})
            .to(0.3, {scale:Vec3.ONE}, {easing:'bounceOut'})
            .start();
        }
        
        if (this.logoEffect) {
            this.logoEffect.active = true;
            tween(this.logoEffect)
            .hide()
            .delay(0.2)
            .show()
            .to(0.2, {scale:v3(3, 3, 1)}, {easing:'expoOut'})
            .destroySelf()
            .start();
        }
    }

    protected onDestroy(): void {
        Tween.stopAll();
    }

    // update(deltaTime: number) {
        
    // }

    onBtnPlay() {
        // if (this.playButton){
        //     const btn = this.playButton.getComponent(Button);
        //     if (btn)
        //         btn.enabled = false;
        // }
        super_html_playable.track_gtag('winInstall');
        super_html_playable.download();
    }
}


