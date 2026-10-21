package com.openai.workouttracker;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.Image;
import android.os.Bundle;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.util.Size;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.ComponentActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.Preview;
import androidx.camera.core.ImageProxy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.pose.Pose;
import com.google.mlkit.vision.pose.PoseDetection;
import com.google.mlkit.vision.pose.PoseDetector;
import com.google.mlkit.vision.pose.PoseLandmark;
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * On-device, camera-based exercise guidance in Egyptian Arabic.
 * Rules cover only selected exercise families; no biomechanical safety certification.
 */
public class CoachActivity extends ComponentActivity {
    private static final int CAMERA_REQUEST = 41;
    private PreviewView preview;
    private TextView messageView, counterView, angleView, modeView;
    private Button voiceButton;
    private ExecutorService cameraExecutor;
    private ProcessCameraProvider cameraProvider;
    private PoseDetector detector;
    private TextToSpeech tts;
    private boolean arabicVoiceAvailable = false;
    private boolean voiceEnabled = true;
    private long lastSpokenMs = 0;
    private String lastSpokenMessage = "";
    private String exerciseId = "";
    private String exerciseName = "";
    private Mode mode = Mode.PREVIEW_ONLY;
    private int reps = 0;
    private boolean reachedFirstPosition = false;
    private float filteredAngle = Float.NaN;
    private long lastReliableFrame = 0;
    private long lastRepMs = 0;
    private boolean closing = false;

    private enum Mode { SQUAT, HINGE, PRESS, CURL, RAISE, PUSHUP, PREVIEW_ONLY }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        exerciseId = getIntent().getStringExtra("exerciseId");
        exerciseName = getIntent().getStringExtra("exerciseName");
        if (exerciseId == null) exerciseId = "";
        if (exerciseName == null) exerciseName = "";
        mode = classify(exerciseName);
        makeScreen();
        cameraExecutor = Executors.newSingleThreadExecutor();
        detector = PoseDetection.getClient(new PoseDetectorOptions.Builder()
                .setDetectorMode(PoseDetectorOptions.STREAM_MODE).build());
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                int language = tts.setLanguage(Locale.forLanguageTag("ar-EG"));
                if (language == TextToSpeech.LANG_MISSING_DATA
                        || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                    language = tts.setLanguage(new Locale("ar"));
                }
                arabicVoiceAvailable = language >= TextToSpeech.LANG_AVAILABLE;
                if (!arabicVoiceAvailable) {
                    messageView.setText("التوجيه مكتوب بالعربي. لتشغيل الصوت نزّل صوت عربي من إعدادات تحويل النص إلى كلام.");
                }
            }
        });
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
        }
    }

    private Mode classify(String name) {
        String n = name.toLowerCase(Locale.US);
        if (n.contains("split squat") || n.contains("lunge") || n.contains("step-up"))
            return Mode.PREVIEW_ONLY;
        if (n.contains("squat")) return Mode.SQUAT;
        if (n.contains("deadlift") || n.contains("good morning") || n.contains("pull-through"))
            return Mode.HINGE;
        if (n.contains("shoulder press") || n.contains("arnold press") || n.contains("landmine press"))
            return Mode.PRESS;
        if (n.contains("lateral raise")) return Mode.RAISE;
        if (n.contains("curl") && !n.contains("leg curl") && !n.contains("hamstring curl"))
            return Mode.CURL;
        if (n.contains("push-up")) return Mode.PUSHUP;
        return Mode.PREVIEW_ONLY;
    }

    private int dp(float n) {
        return (int) (getResources().getDisplayMetrics().density * n + 0.5f);
    }

    private GradientDrawable background(int color, int border) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(dp(16));
        if (border != 0) shape.setStroke(dp(1), border);
        return shape;
    }

    private TextView label(String value, int sp, boolean bold) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextColor(Color.WHITE);
        v.setTextSize(sp);
        v.setTextDirection(View.TEXT_DIRECTION_RTL);
        v.setGravity(Gravity.CENTER);
        if (bold) v.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return v;
    }

    private void makeScreen() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        preview = new PreviewView(this);
        preview.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(preview, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.VERTICAL);
        top.setPadding(dp(12), dp(12), dp(12), dp(12));
        top.setBackground(background(0xDD10233B, 0));
        FrameLayout.LayoutParams topParams = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        topParams.setMargins(dp(12), dp(26), dp(12), 0);
        root.addView(top, topParams);

        TextView title = label("المدرب الذكي • " + exerciseName, 18, true);
        top.addView(title);
        modeView = label(mode == Mode.PREVIEW_ONLY
                ? "متابعة الجسم فقط — تقييم التقنية والعدّ غير متاحين للتمرين ده"
                : "وجّه الموبايل بحيث جسمك كله يبان؛ التحليل تقريبي", 13, false);
        modeView.setPadding(0, dp(8), 0, dp(4));
        top.addView(modeView);

        counterView = label("٠ عدات", 29, true);
        counterView.setPadding(0, dp(4), 0, 0);
        top.addView(counterView);

        angleView = label("زاوية الحركة: —", 13, false);
        top.addView(angleView);

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(12), dp(12), dp(12), dp(12));
        bottom.setBackground(background(0xEE10233B, 0));
        FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        bottomParams.setMargins(dp(12), 0, dp(12), dp(26));
        root.addView(bottom, bottomParams);

        messageView = label("حط الموبايل على حامل، وابعد شوية وخلي جسمك كله واضح.", 17, true);
        messageView.setMinHeight(dp(64));
        bottom.addView(messageView);

        TextView caution = label("إرشادات تقريبية من كاميرا واحدة؛ مش بديل عن مدرب مؤهل. وقف لو في ألم.", 12, false);
        caution.setPadding(0, dp(4), 0, dp(10));
        bottom.addView(caution);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setGravity(Gravity.CENTER);
        voiceButton = new Button(this);
        voiceButton.setText("🔊 الصوت شغال");
        voiceButton.setAllCaps(false);
        voiceButton.setOnClickListener(v -> {
            voiceEnabled = !voiceEnabled;
            voiceButton.setText(voiceEnabled ? "🔊 الصوت شغال" : "🔇 الصوت مقفول");
            if (!voiceEnabled && tts != null) tts.stop();
        });
        buttons.addView(voiceButton, new LinearLayout.LayoutParams(0, dp(54), 1));

        Button end = new Button(this);
        end.setText("إنهاء التدريب");
        end.setAllCaps(false);
        end.setOnClickListener(v -> finishCoach());
        LinearLayout.LayoutParams endLp = new LinearLayout.LayoutParams(0, dp(54), 1);
        endLp.setMargins(dp(8), 0, 0, 0);
        buttons.addView(end, endLp);
        bottom.addView(buttons);
        setContentView(root);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                showMessage("محتاج إذن الكاميرا علشان أتابع حركتك. فعّله من إعدادات التطبيق.");
            }
        }
    }

    private void startCamera() {
        if (closing) return;
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            if (closing || isFinishing()) return;
            try {
                cameraProvider = future.get();
                Preview cameraPreview = new Preview.Builder().build();
                cameraPreview.setSurfaceProvider(preview.getSurfaceProvider());
                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setTargetResolution(new Size(640, 480))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();
                analysis.setAnalyzer(cameraExecutor, this::analyze);
                cameraProvider.unbindAll();
                CameraSelector camera = cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)
                        ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;
                cameraProvider.bindToLifecycle(this, camera, cameraPreview, analysis);
            } catch (Exception e) {
                showMessage("مش قادر أشغّل الكاميرا. جرّب تقفل التطبيق وتفتحه تاني.");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void analyze(ImageProxy imageProxy) {
        Image mediaImage = imageProxy.getImage();
        if (mediaImage == null || closing) {
            imageProxy.close();
            return;
        }
        InputImage input = InputImage.fromMediaImage(
                mediaImage, imageProxy.getImageInfo().getRotationDegrees());
        detector.process(input)
                .addOnSuccessListener(pose -> {
                    if (!closing) updatePose(pose);
                })
                .addOnFailureListener(e -> {
                    if (!closing) showMessage("صعب أقرأ وضع جسمك دلوقتي. جرّب إضاءة أقوى.");
                })
                .addOnCompleteListener(task -> imageProxy.close());
    }

    // Camera-based 2D joint angle; require reliable points before offering guidance.
    private static float angle(Pose pose, int a, int b, int c) {
        PoseLandmark p1 = pose.getPoseLandmark(a);
        PoseLandmark p2 = pose.getPoseLandmark(b);
        PoseLandmark p3 = pose.getPoseLandmark(c);
        if (p1 == null || p2 == null || p3 == null) return Float.NaN;
        if (Math.min(p1.getInFrameLikelihood(), Math.min(
                p2.getInFrameLikelihood(), p3.getInFrameLikelihood())) < 0.60f)
            return Float.NaN;
        double first = Math.atan2(p1.getPosition().y - p2.getPosition().y,
                p1.getPosition().x - p2.getPosition().x);
        double second = Math.atan2(p3.getPosition().y - p2.getPosition().y,
                p3.getPosition().x - p2.getPosition().x);
        double degrees = Math.abs(Math.toDegrees(first - second));
        return (float) (degrees > 180 ? 360 - degrees : degrees);
    }

    private float measure(Pose pose, boolean left) {
        int shoulder = left ? PoseLandmark.LEFT_SHOULDER : PoseLandmark.RIGHT_SHOULDER;
        int elbow = left ? PoseLandmark.LEFT_ELBOW : PoseLandmark.RIGHT_ELBOW;
        int wrist = left ? PoseLandmark.LEFT_WRIST : PoseLandmark.RIGHT_WRIST;
        int hip = left ? PoseLandmark.LEFT_HIP : PoseLandmark.RIGHT_HIP;
        int knee = left ? PoseLandmark.LEFT_KNEE : PoseLandmark.RIGHT_KNEE;
        int ankle = left ? PoseLandmark.LEFT_ANKLE : PoseLandmark.RIGHT_ANKLE;
        switch (mode) {
            case SQUAT: return angle(pose, hip, knee, ankle);
            case HINGE: return angle(pose, shoulder, hip, knee);
            case PRESS:
            case CURL:
            case PUSHUP: return angle(pose, shoulder, elbow, wrist);
            case RAISE: return angle(pose, elbow, shoulder, hip);
            default: return Float.NaN;
        }
    }

    private void updatePose(Pose pose) {
        if (isFinishing()) return;
        if (pose.getAllPoseLandmarks().size() < 12) {
            showMessage("مش شايف جسمك كويس. ابعد الموبايل وخليك في الكادر.");
            return;
        }
        lastReliableFrame = SystemClock.elapsedRealtime();
        if (mode == Mode.PREVIEW_ONLY) {
            showMessage("شايف الجسم في الكاميرا، لكن التمرين ده لسه مش مدعوم بتصحيح التقنية.");
            return;
        }

        float left = measure(pose, true);
        float right = measure(pose, false);
        float current = Float.isNaN(left) ? right : (Float.isNaN(right) ? left : (left + right) / 2f);
        if (Float.isNaN(current)) {
            showMessage("خلي المفاصل المطلوبة باينة في الكاميرا، وجرّب تصور من الجنب.");
            return;
        }
        filteredAngle = Float.isNaN(filteredAngle) ? current : 0.65f * filteredAngle + 0.35f * current;
        final float value = filteredAngle;
        angleView.setText("زاوية الحركة التقريبية: " + Math.round(value) + "°");

        float low, high;
        String downCue, upCue;
        switch (mode) {
            case SQUAT:
                low = 115; high = 158;
                downCue = "كويس، اطلع بهدوء واثبت رجليك.";
                upCue = "انزل بهدوء وتحكّم في الحركة.";
                break;
            case HINGE:
                low = 122; high = 157;
                downCue = "ارفع جسمك بهدوء من مفصل الحوض.";
                upCue = "ارجع بالحوض لورا مع حركة متحكم فيها.";
                break;
            case PRESS:
                low = 95; high = 150;
                downCue = "ادفع لفوق بهدوء.";
                upCue = "نزّل الوزن بتحكم، ومتستعجلش.";
                break;
            case CURL:
                low = 87; high = 146;
                downCue = "انزل بإيدك ببطء ومن غير مرجحة.";
                upCue = "اثني الكوع بهدوء ومن غير ما تهز جسمك.";
                break;
            case RAISE:
                low = 25; high = 75;
                downCue = "ارفع دراعك لحد مستوى الكتف تقريباً، من غير مرجحة.";
                upCue = "نزّل دراعك ببطء وخليك متحكم.";
                break;
            case PUSHUP:
                low = 95; high = 152;
                downCue = "اطلع بهدوء واثبت جسمك.";
                upCue = "انزل ببطء وخلي جسمك ثابت.";
                break;
            default: return;
        }

        // SQUAT/HINGE/PUSHUP: bent -> extended. PRESS: bent -> extended.
        // CURL: bent -> extended; RAISE: arm raised -> lowered.
        boolean contracted = mode == Mode.RAISE ? value > high : value < low;
        boolean extended = mode == Mode.RAISE ? value < low : value > high;
        if (!reachedFirstPosition && contracted) {
            reachedFirstPosition = true;
            showMessage(downCue);
            speak(downCue, false);
        } else if (reachedFirstPosition && extended) {
            long now = SystemClock.elapsedRealtime();
            if (now - lastRepMs >= 600) {
                reps++;
                lastRepMs = now;
                counterView.setText(reps + " عدات");
                showMessage("عاش! كمّل بنفس التحكم.");
                if (reps == 1 || reps % 3 == 0) speak("عاش! " + reps + " عدات", true);
            }
            reachedFirstPosition = false;
        } else if (SystemClock.elapsedRealtime() - lastSpokenMs > 8500) {
            showMessage(reachedFirstPosition ? downCue : upCue);
            speak(reachedFirstPosition ? downCue : upCue, false);
        }
    }

    private void showMessage(String message) {
        if (!message.equals(messageView.getText().toString())) messageView.setText(message);
    }

    private void speak(String message, boolean repAnnouncement) {
        if (!voiceEnabled || !arabicVoiceAvailable || tts == null) return;
        long now = SystemClock.elapsedRealtime();
        if (now - lastSpokenMs < (repAnnouncement ? 2300 : 5500)) return;
        if (!repAnnouncement && message.equals(lastSpokenMessage) && now - lastSpokenMs < 13000) return;
        tts.speak(message, TextToSpeech.QUEUE_FLUSH, null, "coach-" + now);
        lastSpokenMs = now;
        lastSpokenMessage = message;
    }

    private void finishCoach() {
        if (closing) return;
        closing = true;
        Intent result = new Intent();
        result.putExtra("exerciseId", exerciseId);
        result.putExtra("reps", reps);
        result.putExtra("mode", mode.name());
        setResult(Activity.RESULT_OK, result);
        finish();
    }

    @Override public void onBackPressed() { finishCoach(); }

    @Override protected void onDestroy() {
        closing = true;
        if (cameraProvider != null) cameraProvider.unbindAll();
        if (detector != null) detector.close();
        if (cameraExecutor != null) cameraExecutor.shutdown();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}
