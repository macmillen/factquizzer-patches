package app.revanced.patches.youtube.player.factquizzer;

import app.revanced.patcher.patch.BytecodePatch;
import app.revanced.patcher.patch.BytecodePatchBuilder;
import app.revanced.patcher.patch.BytecodePatchContext;
import app.revanced.patcher.patch.Patch;
import app.revanced.patcher.patch.PatchKt;
import app.revanced.patches.youtube.player.overlaybuttons.OverlayButtonsPatchKt;
import app.revanced.patches.youtube.utils.compatibility.Constants;
import app.revanced.patches.youtube.utils.playercontrols.PlayerControlsPatchKt;
import app.revanced.patches.youtube.utils.settings.ResourceUtils;
import app.revanced.patches.youtube.utils.settings.SettingsPatchKt;
import kotlin.Pair;
import kotlin.Unit;

/**
 * Standalone ReVanced patch for FactQuizzer player button integration.
 * Allows enabling/disabling the FactQuizzer button in ReVanced Manager / CLI.
 */
public final class FactQuizzerPatch {
    private static final BytecodePatch patch;

    static {
        patch = PatchKt.bytecodePatch(
            "FactQuizzer player button",
            "Adds a dedicated button in the player overlay to launch FactQuizzer.",
            true,
            builder -> {
                builder.compatibleWith(new Pair[] { Constants.INSTANCE.getCOMPATIBLE_PACKAGE() });
                builder.dependsOn(new Patch[] {
                    PlayerControlsPatchKt.getPlayerControlsPatch(),
                    OverlayButtonsPatchKt.getOverlayButtonsPatch(),
                    SettingsPatchKt.getSettingsPatch()
                });
                builder.execute(context -> {
                    PlayerControlsPatchKt.injectControl("Lapp/revanced/extension/youtube/patches/overlaybutton/QuizButton;", false, true);
                    ResourceUtils.INSTANCE.addPreference(new String[] { "SETTINGS: FACTQUIZZER" });
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            }
        );
    }

    public static BytecodePatch getFactQuizzerPatch() {
        return patch;
    }
}
