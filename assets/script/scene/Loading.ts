import { _decorator, Component, director, Node, ProgressBar } from 'cc';
import super_html_playable from '../super_html_playable';
const { ccclass, property } = _decorator;

@ccclass('Loading')
export class Loading extends Component {
    @property(ProgressBar)
    loadingBar:ProgressBar = null;
    start() {
        super_html_playable.track_gtag('playablePageView');
    }

    update(deltaTime: number) {
        if (this.loadingBar && this.loadingBar.progress < 1) {
            this.loadingBar.progress += deltaTime;
        }else{
            director.loadScene("main");
        }
    }
}


