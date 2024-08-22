import { _decorator, Component, Node, ProgressBar, sys } from 'cc';
import { GameState } from '../manager/GameState';
import GameCamera from './GameCamera';
import super_html_playable from '../super_html_playable';
import { GameMgr } from '../manager/GameMgr';
const { ccclass, property } = _decorator;

@ccclass('LoadingBar')
export class LoadingBar extends Component {
    @property(ProgressBar)
    progressBar:ProgressBar = null;

    protected _maxSeconds:number = GameCamera.TIME_WORM - 1;
    protected _timer:number = 0;
    protected _finished:boolean = false;

    start() {
        if (!this.progressBar)
            this.progressBar = this.getComponent(ProgressBar);
    }

    update(deltaTime: number) {
        if (this.progressBar && !this._finished) {
            this._timer += deltaTime;
            let progress = this._timer / this._maxSeconds;
            if (progress >= 1) {
                progress = 1;
                this._finished = true;
                this.node.parent.active = false;
                GameState.setState(super_html_playable.version() != GameMgr.VERSION.FIRST_TAP_NO_INTRO ? GameState.State.WORM : GameState.State.LEVEL1);
            }
            this.progressBar.progress = progress;
        }
    }
}


