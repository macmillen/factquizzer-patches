.class public final synthetic Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch$$ExternalSyntheticLambda0;
.super Ljava/lang/Object;
.source "D8$$SyntheticClass"

# interfaces
.implements Lkotlin/jvm/functions/Function1;


# direct methods
.method public synthetic constructor <init>()V
    .registers 1

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public final invoke(Ljava/lang/Object;)Ljava/lang/Object;
    .registers 2

    check-cast p1, Lapp/revanced/patcher/patch/BytecodePatchBuilder;

    invoke-static {p1}, Lapp/revanced/patches/youtube/player/factquizzer/FactQuizzerPatch;->lambda$static$1(Lapp/revanced/patcher/patch/BytecodePatchBuilder;)Lkotlin/Unit;

    move-result-object p1

    return-object p1
.end method
