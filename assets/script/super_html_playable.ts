/**
 * super-html playable adapter
 * @help https://store.cocos.com/app/detail/3657
 * syncRH
 * M030724m
 * @home https://github.com/magician-f/cocos-playable-demo
 * @author https://github.com/magician-f
 */

/**
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2SGNKC5XHR"></script>
<script>
window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); } gtag('js', new Date()); gtag('config', 'G-2SGNKC5XHR');
</script>

... ...
window.super_html={
... ...
version:1,hideSoundButton:0,hideAllButton:0,network:'AppLovin',
... ...
 */
const google_play = "https://play.google.com/store/apps/details?id=com.nexters.herowars";
const apple_store = "https://apps.apple.com/us/app/hero-wars-fantasy-world/id1158967485";
let playable = "hw_bng_plmightyrooms146";// a, b, c,...
let networkName = null;

export class super_html_playable {
    protected _gotoDownload:boolean = false;
    constructor() {
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    handleVisibilityChange() {
        if (!document.hidden) {
            if (this._gotoDownload) {
                this._gotoDownload = false;
                this.track_gtag('returnsFromStore');
            }
        }
    }

    version() {
        //@ts-ignore
        return window.super_html && super_html.version ? super_html.version : 1;
    }

    hideSoundButton() {// Liftoff, IronSource
        //@ts-ignore
        return window.super_html && super_html.hideSoundButton ? super_html.hideSoundButton : 0;
    }

    hideAllButton() {// Google
        //@ts-ignore
        return window.super_html && super_html.hideAllButton ? super_html.hideAllButton : 0;
    }

    rightLogo() {// IronSource
        //@ts-ignore
        return window.super_html && super_html.rightLogo ? super_html.rightLogo : 0;
    }

    getPlayUrl() {
        if (apple_store && this.getMobileOperatingSystem() == 'iOS')
            return apple_store;
        
        return google_play;
    }

    download() {
        this.set_google_play_url(google_play);
        this.set_app_store_url(apple_store);
        // console.log("download");
        //@ts-ignore
        window.super_html && super_html.download(this.getPlayUrl());

        this._gotoDownload = true;
    }

    game_end() {
        // console.log("game end");
        this.track_gtag('winInstall');
        this.track_gtag('win');
        //@ts-ignore
        window.super_html && super_html.game_end && super_html.game_end();
    }

    /**
     * 是否隐藏下载按钮，意味着使用平台注入的下载按钮
     * channel : google
     */
    is_hide_download() {
        //@ts-ignore
        if (window.super_html && super_html.is_hide_download) {
            //@ts-ignore
            return super_html.is_hide_download();
        }
        return false
    }

    /**
     * 设置商店地址
     * channel : unity
     * @param url https://play.google.com/store/apps/details?id=com.unity3d.auicreativetestapp
     */
    set_google_play_url(url: string) {
        //@ts-ignore
        window.super_html && (super_html.google_play_url = url);
    }

    /**
    * 设置商店地址
    * channel : unity
    * @param url https://apps.apple.com/us/app/ad-testing/id1463016906
    */
    set_app_store_url(url: string) {
        //@ts-ignore
        window.super_html && (super_html.appstore_url = url);
    }

    game_interaction() {
    }

    track_gtag(eventName:string) {
        // UTF8ToString
        //@ts-ignore
        if (typeof gtag === "undefined") {
            // console.log("Gtag not defined. Google Analytics event {", eventName, "} not sent");
            return;
        }

        if (networkName == null) {
            //@ts-ignore
            if (window.super_html){
                //@ts-ignore
                if (window.super_html_channel){
                    //@ts-ignore
                    networkName = window.super_html_channel;
                    playable += String.fromCharCode('a'.charCodeAt(0) + this.version() - 1);
                }
            }

        }

        console.log("jsAddEvent event: ", eventName, ", eventPlayable: ", playable, ", channel: ", networkName);
        //@ts-ignore
        gtag("event", eventName, { eventPlayable: playable, channel: networkName }); 
    }

    getMobileOperatingSystem() {
        var userAgent = navigator.userAgent || navigator.vendor || window["opera"];
        if (/windows phone/i.test(userAgent)) {
            return "Windows Phone";
        }
        if (/android/i.test(userAgent)) {
            return "Android";
        }
        if (/iPad|iPhone|iPod/.test(userAgent) && !window["MSStream"]) {
            return "iOS";
        }
        return "unknown";
    }
}
export default new super_html_playable();