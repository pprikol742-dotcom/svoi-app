package ru.svoi.lugansk;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import com.getcapacitor.BridgeActivity;
import com.yandex.mobile.ads.banner.BannerAdEventListener;
import com.yandex.mobile.ads.banner.BannerAdSize;
import com.yandex.mobile.ads.banner.BannerAdView;
import com.yandex.mobile.ads.common.AdRequest;
import com.yandex.mobile.ads.common.AdRequestError;
import com.yandex.mobile.ads.common.ImpressionData;

public class MainActivity extends BridgeActivity {
    // TODO: перед публикацией в сторе замените демо-ID на настоящий adUnitId
    // из личного кабинета Яндекс.Рекламной сети (partner.yandex.ru)
    private static final String AD_UNIT_ID = "demo-banner-yandex";

    private BannerAdView bannerAdView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        createChatNotificationChannel();

        // Достаём WebView, который уже создал Capacitor
        ViewGroup webView = getBridge().getWebView();
        ViewGroup webViewParent = (ViewGroup) webView.getParent();
        webViewParent.removeView(webView);

        // Собираем новый корневой layout: сверху WebView, снизу рекламный баннер
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);

        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        rootLayout.addView(webView, webViewParams);

        bannerAdView = new BannerAdView(this);

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int adWidth = Math.round(dm.widthPixels / dm.density);
        bannerAdView.setAdSize(BannerAdSize.sticky(this, adWidth));

        bannerAdView.setBannerAdEventListener(new BannerAdEventListener() {
            @Override
            public void onAdLoaded() {}

            @Override
            public void onAdFailedToLoad(AdRequestError adRequestError) {}

            @Override
            public void onAdClicked() {}

            @Override
            public void onImpression(ImpressionData impressionData) {}
        });
        // В SDK 8+ adUnitId передаётся не через setAdUnitId(), а прямо в AdRequest.Builder
        bannerAdView.loadAd(new AdRequest.Builder(AD_UNIT_ID).build());

        LinearLayout.LayoutParams bannerParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rootLayout.addView(bannerAdView, bannerParams);

        setContentView(rootLayout);
    }

    // Канал уведомлений для сообщений в чате — создаём один раз при старте
    // приложения. Без этого на Android 8+ push с channel_id="chat_messages"
    // может не показаться со звуком (или не показаться вовсе).
    private void createChatNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
                "chat_messages",
                "Сообщения в чате",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Уведомления о новых сообщениях от покупателей и продавцов");
        channel.enableVibration(true);
        channel.setSound(
                Settings.System.DEFAULT_NOTIFICATION_URI,
                new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
        );

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        if (bannerAdView != null) {
            bannerAdView.destroy();
        }
        super.onDestroy();
    }
}
