.class public final Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch;
.super Ljava/lang/Object;
.source "FactQuizzerPatch.java"


# static fields
.field private static final patch:Lapp/revanced/patcher/patch/BytecodePatch;


# direct methods
.method static constructor <clinit>()V
    .registers 4

    .line 20
    new-instance v0, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch$$ExternalSyntheticLambda0;

    invoke-direct {v0}, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch$$ExternalSyntheticLambda0;-><init>()V

    const-string v1, "FactQuizzer player button"

    const-string v2, "Adds a dedicated button in the player overlay to launch FactQuizzer."

    const/4 v3, 0x1

    invoke-static {v1, v2, v3, v0}, Lapp/revanced/patcher/patch/PatchKt;->bytecodePatch(Ljava/lang/String;Ljava/lang/String;ZLkotlin/jvm/functions/Function1;)Lapp/revanced/patcher/patch/BytecodePatch;

    move-result-object v0

    sput-object v0, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch;->patch:Lapp/revanced/patcher/patch/BytecodePatch;

    .line 39
    return-void
.end method

.method public constructor <init>()V
    .registers 1

    .line 16
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static getFactQuizzerPatch()Lapp/revanced/patcher/patch/BytecodePatch;
    .registers 1

    .line 42
    sget-object v0, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch;->patch:Lapp/revanced/patcher/patch/BytecodePatch;

    return-object v0
.end method

.method static synthetic lambda$static$0(Lapp/revanced/patcher/patch/BytecodePatchContext;)Lkotlin/Unit;
    .registers 4

    .line 32
    const-string p0, "Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;"

    const/4 v0, 0x0

    const/4 v1, 0x1

    invoke-static {p0, v0, v1}, Lapp/revanced/patches/youtube/utils/playercontrols/PlayerControlsPatchKt;->injectControl(Ljava/lang/String;ZZ)V

    .line 33
    sget-object p0, Lapp/revanced/patches/youtube/utils/settings/ResourceUtils;->INSTANCE:Lapp/revanced/patches/youtube/utils/settings/ResourceUtils;

    new-array v1, v1, [Ljava/lang/String;

    const-string v2, "SETTINGS: FACTQUIZZER"

    aput-object v2, v1, v0

    invoke-virtual {p0, v1}, Lapp/revanced/patches/youtube/utils/settings/ResourceUtils;->addPreference([Ljava/lang/String;)V

    .line 34
    sget-object p0, Lkotlin/Unit;->INSTANCE:Lkotlin/Unit;

    return-object p0
.end method

.method static synthetic lambda$static$1(Lapp/revanced/patcher/patch/BytecodePatchBuilder;)Lkotlin/Unit;
    .registers 5

    .line 25
    const/4 v0, 0x1

    new-array v1, v0, [Lkotlin/Pair;

    sget-object v2, Lapp/revanced/patches/youtube/utils/compatibility/Constants;->INSTANCE:Lapp/revanced/patches/youtube/utils/compatibility/Constants;

    invoke-virtual {v2}, Lapp/revanced/patches/youtube/utils/compatibility/Constants;->getCOMPATIBLE_PACKAGE()Lkotlin/Pair;

    move-result-object v2

    const/4 v3, 0x0

    aput-object v2, v1, v3

    invoke-virtual {p0, v1}, Lapp/revanced/patcher/patch/BytecodePatchBuilder;->compatibleWith([Lkotlin/Pair;)V

    .line 26
    const/4 v1, 0x3

    new-array v1, v1, [Lapp/revanced/patcher/patch/Patch;

    .line 27
    invoke-static {}, Lapp/revanced/patches/youtube/utils/playercontrols/PlayerControlsPatchKt;->getPlayerControlsPatch()Lapp/revanced/patcher/patch/BytecodePatch;

    move-result-object v2

    aput-object v2, v1, v3

    .line 28
    invoke-static {}, Lapp/revanced/patches/youtube/player/overlaybuttons/OverlayButtonsPatchKt;->getOverlayButtonsPatch()Lapp/revanced/patcher/patch/ResourcePatch;

    move-result-object v2

    aput-object v2, v1, v0

    .line 29
    invoke-static {}, Lapp/revanced/patches/youtube/utils/settings/SettingsPatchKt;->getSettingsPatch()Lapp/revanced/patcher/patch/ResourcePatch;

    move-result-object v0

    const/4 v2, 0x2

    aput-object v0, v1, v2

    .line 26
    invoke-virtual {p0, v1}, Lapp/revanced/patcher/patch/BytecodePatchBuilder;->dependsOn([Lapp/revanced/patcher/patch/Patch;)V

    .line 31
    new-instance v0, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch$$ExternalSyntheticLambda1;

    invoke-direct {v0}, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch$$ExternalSyntheticLambda1;-><init>()V

    invoke-virtual {p0, v0}, Lapp/revanced/patcher/patch/BytecodePatchBuilder;->execute(Lkotlin/jvm/functions/Function1;)V

    .line 36
    sget-object p0, Lkotlin/Unit;->INSTANCE:Lkotlin/Unit;

    return-object p0
.end method
