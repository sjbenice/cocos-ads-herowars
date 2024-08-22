export class GameState {
    static State = {
        SPLASH: -1,
        WORM: 0,
        FALL: 1,
        LEVEL1: 2,
        LEVEL2: 3,
        LEVEL3: 4,
        END: 5,
    };

    protected static _state: number = GameState.State.SPLASH;
    protected static _isChanged:boolean = false;

    public static setState(state:number) {
        if (GameState._state != state) {
            GameState._state = state;
            GameState._isChanged = true;
        }
    }

    public static getState(): number {
        return GameState._state;
    }

    public static isChanged() : boolean {
        const ret = GameState._isChanged;
        GameState._isChanged = false;
        return ret;
    }
}


