.class public final Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;
.super Ljava/lang/Object;
.source "QuizButton.kt"


# static fields
.field public static final INSTANCE:Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

.field private static instance:Lapp/revanced/extension/youtube/shared/PlayerControlButton;

.field private static final SETTING:Lapp/revanced/extension/shared/settings/BooleanSetting;


# direct methods
.method public static synthetic $r8$lambda$Quiz3()Ljava/lang/String;
    .registers 1

    invoke-static {}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->initializeButton$lambda$3()Ljava/lang/String;

    move-result-object v0

    return-object v0
.end method

.method public static synthetic $r8$lambda$Quiz0()Z
    .registers 1

    invoke-static {}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->initializeButton$lambda$0()Z

    move-result v0

    return v0
.end method

.method public static synthetic $r8$lambda$Quiz1(Landroid/view/View;)V
    .registers 1

    invoke-static {p0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->initializeButton$lambda$1(Landroid/view/View;)V

    return-void
.end method

.method public static synthetic $r8$lambda$Quiz2(Landroid/view/View;)Z
    .registers 1

    invoke-static {p0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->initializeButton$lambda$2(Landroid/view/View;)Z

    move-result p0

    return p0
.end method

.method static constructor <clinit>()V
    .registers 3

    new-instance v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

    invoke-direct {v0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;-><init>()V

    sput-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->INSTANCE:Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

    new-instance v0, Lapp/revanced/extension/shared/settings/BooleanSetting;

    const-string v1, "revanced_overlay_button_factquizzer"

    sget-object v2, Ljava/lang/Boolean;->TRUE:Ljava/lang/Boolean;

    invoke-direct {v0, v1, v2}, Lapp/revanced/extension/shared/settings/BooleanSetting;-><init>(Ljava/lang/String;Ljava/lang/Boolean;)V

    sput-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->SETTING:Lapp/revanced/extension/shared/settings/BooleanSetting;

    return-void
.end method

.method private constructor <init>()V
    .registers 1

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static final initializeButton(Landroid/view/View;)V
    .registers 11

    const-string v0, "controlsView"

    invoke-static {p0, v0}, Lkotlin/jvm/internal/Intrinsics;->checkNotNullParameter(Ljava/lang/Object;Ljava/lang/String;)V

    :try_start_5
    new-instance v1, Lapp/revanced/extension/youtube/shared/PlayerControlButton;

    const-string v3, "revanced_quiz_button"

    new-instance v5, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda0;

    invoke-direct {v5}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda0;-><init>()V

    new-instance v6, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda1;

    invoke-direct {v6}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda1;-><init>()V

    new-instance v7, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda2;

    invoke-direct {v7}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda2;-><init>()V

    const/4 v8, 0x4

    const/4 v9, 0x0

    const/4 v4, 0x0

    move-object v2, p0

    invoke-direct/range {v1 .. v9}, Lapp/revanced/extension/youtube/shared/PlayerControlButton;-><init>(Landroid/view/View;Ljava/lang/String;ZLapp/revanced/extension/youtube/shared/PlayerControlButton$PlayerControlButtonVisibility;Landroid/view/View$OnClickListener;Landroid/view/View$OnLongClickListener;ILkotlin/jvm/internal/DefaultConstructorMarker;)V

    sput-object v1, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->instance:Lapp/revanced/extension/youtube/shared/PlayerControlButton;
    :try_end_21
    .catch Ljava/lang/Exception; {:try_start_5 .. :try_end_21} :catch_22

    return-void

    :catch_22
    move-exception v0

    move-object p0, v0

    new-instance v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda3;

    invoke-direct {v0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton$$ExternalSyntheticLambda3;-><init>()V

    invoke-static {v0, p0}, Lapp/revanced/extension/shared/utils/Logger;->printException(Lapp/revanced/extension/shared/utils/Logger$LogMessage;Ljava/lang/Throwable;)V

    return-void
.end method

.method private static final initializeButton$lambda$0()Z
    .registers 1

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->INSTANCE:Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

    invoke-direct {v0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->isButtonEnabled()Z

    move-result v0

    return v0
.end method

.method private static final initializeButton$lambda$1(Landroid/view/View;)V
    .registers 2

    const-string v0, "view"

    invoke-static {p0, v0}, Lkotlin/jvm/internal/Intrinsics;->checkNotNullParameter(Ljava/lang/Object;Ljava/lang/String;)V

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->INSTANCE:Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

    invoke-direct {v0, p0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->onClick(Landroid/view/View;)V

    return-void
.end method

.method private static final initializeButton$lambda$2(Landroid/view/View;)Z
    .registers 2

    const-string v0, "view"

    invoke-static {p0, v0}, Lkotlin/jvm/internal/Intrinsics;->checkNotNullParameter(Ljava/lang/Object;Ljava/lang/String;)V

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->INSTANCE:Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;

    invoke-direct {v0, p0}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->onLongClick(Landroid/view/View;)V

    const/4 p0, 0x1

    return p0
.end method

.method private static final initializeButton$lambda$3()Ljava/lang/String;
    .registers 1

    const-string v0, "QuizButton initializeButton failure"

    return-object v0
.end method

.method private final isButtonEnabled()Z
    .registers 2

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->SETTING:Lapp/revanced/extension/shared/settings/BooleanSetting;

    invoke-virtual {v0}, Lapp/revanced/extension/shared/settings/BooleanSetting;->get()Ljava/lang/Boolean;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v0

    if-eqz v0, :cond_14

    invoke-static {}, Lapp/revanced/extension/youtube/shared/RootView;->isAdProgressTextVisible()Z

    move-result v0

    if-nez v0, :cond_14

    const/4 v0, 0x1

    return v0

    :cond_14
    const/4 v0, 0x0

    return v0
.end method

.method private final onClick(Landroid/view/View;)V
    .registers 4

    invoke-static {}, Lapp/revanced/extension/youtube/shared/VideoInformation;->getVideoId()Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_12

    invoke-static {v0}, Lapp/revanced/extension/youtube/utils/VideoUtils;->getVideoUrl(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    const-string v1, "com.factquizzer.overlay"

    invoke-static {v0, v1}, Lapp/revanced/extension/shared/utils/IntentUtils;->launchExternalDownloader(Ljava/lang/String;Ljava/lang/String;)V

    :cond_12
    return-void
.end method

.method private final onLongClick(Landroid/view/View;)V
    .registers 2

    invoke-direct {p0, p1}, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->onClick(Landroid/view/View;)V

    return-void
.end method

.method public static final setVisibility(ZZ)V
    .registers 3

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->instance:Lapp/revanced/extension/youtube/shared/PlayerControlButton;

    if-eqz v0, :cond_7

    invoke-virtual {v0, p0, p1}, Lapp/revanced/extension/youtube/shared/PlayerControlButton;->setVisibility(ZZ)V

    :cond_7
    return-void
.end method

.method public static final setVisibilityImmediate(Z)V
    .registers 2

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->instance:Lapp/revanced/extension/youtube/shared/PlayerControlButton;

    if-eqz v0, :cond_7

    invoke-virtual {v0, p0}, Lapp/revanced/extension/youtube/shared/PlayerControlButton;->setVisibilityImmediate(Z)V

    :cond_7
    return-void
.end method

.method public static final setVisibilityNegatedImmediate()V
    .registers 1

    sget-object v0, Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;->instance:Lapp/revanced/extension/youtube/shared/PlayerControlButton;

    if-eqz v0, :cond_7

    invoke-virtual {v0}, Lapp/revanced/extension/youtube/shared/PlayerControlButton;->setVisibilityNegatedImmediate()V

    :cond_7
    return-void
.end method
