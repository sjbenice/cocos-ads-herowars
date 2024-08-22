import { _decorator, assetManager, AudioClip, AudioSource, Component, director, game, sys } from "cc";
const { ccclass, property } = _decorator;

@ccclass('SoundMgr')
export class SoundMgr extends Component{
    @property(AudioSource)
    public audioSource: AudioSource | null = null;

    @property(AudioSource)
    public audioSource_sub: AudioSource | null = null;

    @property(AudioSource)
    public audioSource_worm: AudioSource | null = null;

    private static _instance: SoundMgr = null;
    
    private static _cachedAudioClipMap: Record<string, AudioClip> = {};

    private static _musicVolume: number = 0;
    private static _soundVolume: number = 0;
    private static _musicPref = "musicVolume";
    private static _soundPref = "soundVolume";

    protected static _zeroVolume:number = 0.01;
    protected static _firstClick:boolean = false;
    protected static _isOn:boolean = true;

    onLoad() {
        if (SoundMgr._instance) {
            this.node.destroy();
            return;
        }

        SoundMgr._instance = this;
        director.addPersistRootNode(this.node);

        if (this.audioSource == null)
            this.audioSource = this.node.getComponent(AudioSource);

        if (this.audioSource == null)
            this.audioSource = this.node.addComponent(AudioSource);
        
        // const musicPref = sys.localStorage.getItem(SoundMgr._musicPref);
        // if (musicPref)
        //     SoundMgr._musicVolume = parseFloat(musicPref);

        // const soundPref = sys.localStorage.getItem(SoundMgr._soundPref);
        // if (soundPref)
        //     SoundMgr._soundVolume = parseFloat(soundPref);

        //@ts-ignore
        window.super_html_change_audio = function(on) {
            SoundMgr.onSound(!SoundMgr._isOn);
            /*
            if (window.dapi && window.dapi.getAudioVolume){
                //@ts-ignore
                // const volumne = window.dapi.getAudioVolume();// BUG:Always returns 100
                SoundMgr.onSound(!SoundMgr._isOn);
            }*/
        };
    }

    protected onDestroy(): void {
        if (SoundMgr._instance == this)
            SoundMgr._instance = null;
    }

    public static destroyMgr() {
        if (SoundMgr._instance)
            SoundMgr._instance.node.destroy();
    }

    protected static setPref(musicOrSound:boolean, volume:number){
        SoundMgr._firstClick = true;
        
        // sys.localStorage.setItem(musicOrSound ? SoundMgr._musicPref : SoundMgr._soundPref, volume);
        if (musicOrSound){
            SoundMgr._musicVolume = volume;
            if (volume > SoundMgr._zeroVolume){
                this.playMusic();
            } else {
                this.pauseMusic();
            }
        } else {
            SoundMgr._soundVolume = volume;
            if (SoundMgr._instance && SoundMgr._instance.audioSource_sub) {
                SoundMgr._instance.audioSource_sub.volume = volume;
                if (volume > 0 && SoundMgr._playSfxStart > 0)
                    SoundMgr.playSfx(true);
            }
            
            if (SoundMgr._instance && SoundMgr._instance.audioSource_worm) {
                SoundMgr._instance.audioSource_worm.volume = volume;
                if (volume > 0 && SoundMgr._playWormStart > 0)
                    SoundMgr.playWorm(true);
            }
        }
    }

    protected static getPref(musicOrSound:boolean) : number {
        return musicOrSound ? SoundMgr._musicVolume : SoundMgr._soundVolume;
    }

    public static playMusic (clip: AudioClip = null) {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource!;
            if (clip)
                audioSource.clip = clip;

            if (audioSource.clip){
                audioSource.loop = true;
                audioSource.volume = SoundMgr._musicVolume;
                audioSource.play();
            }
        }
    }

    public static pauseMusic () {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource!;
            if (audioSource && audioSource.playing)
                audioSource.pause();
        }
    }

    public static stopMusic () {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource!;
            if (audioSource.playing) {
                audioSource.stop();
            }
        }
    }

    protected static _playSfxStart:number = 0;
    public static playSfx (play:boolean) {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource_sub;
            if (audioSource) {
                if (play) {
                    if (SoundMgr._firstClick && SoundMgr._isOn) {
                        if (SoundMgr._playSfxStart > 0)
                            audioSource.currentTime = (sys.now() - SoundMgr._playSfxStart) / 1000;
                        audioSource.play();
                        SoundMgr._playSfxStart = 0;
                    } else {
                        SoundMgr._playSfxStart = sys.now();
                    }
                } else
                    audioSource.stop();
            }
        }
    }

    protected static _playWormStart:number = 0;
    public static playWorm (play:boolean) {
        if (SoundMgr._instance){
            const audioSource = SoundMgr._instance.audioSource_worm;
            if (audioSource) {
                if (play) {
                    if (SoundMgr._firstClick && SoundMgr._isOn) {
                        if (SoundMgr._playWormStart > 0)
                            audioSource.currentTime = (sys.now() - SoundMgr._playWormStart) / 1000;
                        audioSource.play();
                        SoundMgr._playWormStart = 0;
                    } else {
                        SoundMgr._playWormStart = sys.now();
                    }
                } else
                    audioSource.stop();
            }
        }
    }

    public static playSound(name: string, isPrimary:boolean = true) {
        if (SoundMgr._soundVolume < SoundMgr._zeroVolume || SoundMgr._instance == null)
            return;

        const audioSource = isPrimary ? SoundMgr._instance.audioSource! : SoundMgr._instance.audioSource_sub;

        const path = `audio/sound/${name}`;
        let cachedAudioClip = SoundMgr._cachedAudioClipMap[path];
        if (cachedAudioClip) {
            audioSource.playOneShot(cachedAudioClip, SoundMgr._soundVolume);
        } else {
            assetManager.resources?.load(path, AudioClip, (err, clip) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                
                SoundMgr._cachedAudioClipMap[path] = clip;
                audioSource.playOneShot(clip, SoundMgr._soundVolume);
            });
        }
    }

    public static DidFirstClick():boolean {
        return SoundMgr._firstClick;
    }

    public static onFirstClick() {
        if (!SoundMgr._firstClick) {
            SoundMgr._firstClick = true;

            SoundMgr.onSound(true);
        }
    }

    public static onSound(on:boolean) {
        const volume:number = on ? 1 : 0;
        SoundMgr.setPref(true, volume);
        SoundMgr.setPref(false, volume);

        SoundMgr._isOn = on;
    }
}


