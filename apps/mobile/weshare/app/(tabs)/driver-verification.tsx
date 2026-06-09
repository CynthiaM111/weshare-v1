/**
 * Driver verification — vehicle details + optional photos (photos when EXPO_PUBLIC_DRIVER_PHOTOS=true).
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSafeArea } from '@/components/ScreenSafeArea';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui/AuthGate';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { canSubmitDriverVerificationWithoutPhotos, isDriverPhotoUploadEnabled } from '@/lib/app-env';
import { CAR_COLOR_SUGGESTIONS } from '@/lib/car-colors';
import {
  getMyDriverVerification,
  submitDriverVerification,
  uploadVerificationImage,
  type DriverVerification,
} from '@/lib/driver-verification';
import {
  isVerificationPhotoPickAvailable,
  pickVerificationImage,
  type PickedVerificationImage,
} from '@/lib/pick-verification-image';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';

function statusMessage(v: DriverVerification | null): { title: string; body: string } {
  if (!v || v.status === 'none') {
    const photosLater = !isDriverPhotoUploadEnabled();
    return {
      title: 'Become a verified driver',
      body: photosLater
        ? 'Enter your vehicle details to apply. Photo upload ships with the Play Store test build — our team may follow up on WhatsApp if needed.'
        : 'Upload your valid driving license and a photo of your car showing the license plate. We review applications manually.',
    };
  }
  if (v.status === 'pending') {
    return {
      title: 'Verification in progress',
      body: 'Our team is reviewing your application. You can post rides once approved.',
    };
  }
  if (v.status === 'approved') {
    return {
      title: 'You\'re verified',
      body: 'You can post rides on WeShare. Your car details will appear to passengers.',
    };
  }
  return {
    title: 'Verification declined',
    body: v.rejectionReason || 'Please resubmit with clearer details.',
  };
}

export default function DriverVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session } = useSession();

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  if (!session) {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <AuthGate
          icon="car.fill"
          title="Driver verification"
          description="Sign in to apply as a verified driver on WeShare."
          redirectPath="/driver-verification"
        />
      </ScreenSafeArea>
    );
  }

  return (
    <DriverVerificationForm
      userId={session.userId}
      router={router}
      insets={insets}
      bg={bg}
      cardBg={cardBg}
      hair={hair}
      textPri={textPri}
      textSub={textSub}
      inputBg={inputBg}
    />
  );
}

function DriverVerificationForm({
  userId,
  router,
  insets,
  bg,
  cardBg,
  hair,
  textPri,
  textSub,
  inputBg,
}: {
  userId: string;
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  bg: string;
  cardBg: string;
  hair: string;
  textPri: string;
  textSub: string;
  inputBg: string;
}) {
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<DriverVerification | null>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [licenseImage, setLicenseImage] = useState<PickedVerificationImage | null>(null);
  const [carImage, setCarImage] = useState<PickedVerificationImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const photosRequired =
    isDriverPhotoUploadEnabled() && isVerificationPhotoPickAvailable();
  const photosOptional = canSubmitDriverVerificationWithoutPhotos();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getMyDriverVerification(userId);
      setVerification(v);
      if (v) {
        setLicensePlate(v.licensePlate);
        setCarModel(v.carModel);
        setCarColor(v.carColor);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = statusMessage(verification);
  const hasRequiredPhotos = !photosRequired || (licenseImage && carImage);
  const canSubmit =
    verification?.status !== 'pending' &&
    verification?.status !== 'approved' &&
    licensePlate.trim().length >= 3 &&
    carModel.trim().length >= 2 &&
    carColor.trim().length >= 2 &&
    hasRequiredPhotos;

  async function pickImage(kind: 'license' | 'car') {
    if (!isVerificationPhotoPickAvailable()) {
      setError('Photo upload is not available in this build. Submit vehicle details for now.');
      return;
    }
    const picked = await pickVerificationImage();
    if (!picked) return;
    if (kind === 'license') setLicenseImage(picked);
    else setCarImage(picked);
    setError('');
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      let licensePath: string | null = null;
      let carPath: string | null = null;

      if (licenseImage) {
        licensePath = await uploadVerificationImage(userId, 'license', licenseImage.uri, licenseImage.mimeType);
      }
      if (carImage) {
        carPath = await uploadVerificationImage(userId, 'car', carImage.uri, carImage.mimeType);
      }

      if (photosRequired && (!licensePath || !carPath)) {
        setError('Please add both photos before submitting.');
        return;
      }

      const err = await submitDriverVerification(userId, {
        licensePlate: licensePlate.trim(),
        carModel: carModel.trim(),
        carColor: carColor.trim(),
        licenseImagePath: licensePath,
        carImagePath: carPath,
      });
      if (err) {
        setError(err);
        return;
      }
      await load();
      setLicenseImage(null);
      setCarImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit verification.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <TabScreenHeader
        title="Driver verification"
        textPri={textPri}
        hair={hair}
        cardBg={cardBg}
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <IconSymbol name="chevron.left" size={22} color={textPri} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <ThemedText style={[styles.statusTitle, { color: textPri }]}>{status.title}</ThemedText>
            <ThemedText style={[styles.statusBody, { color: textSub }]}>{status.body}</ThemedText>
          </View>

          {verification?.status === 'approved' ? (
            <Pressable onPress={() => router.replace('/post-ride' as any)} style={styles.ctaWrap}>
              <LinearGradient colors={[TEAL, '#00a896']} style={styles.ctaGrad}>
                <ThemedText style={styles.ctaText}>Post a ride</ThemedText>
              </LinearGradient>
            </Pressable>
          ) : verification?.status === 'pending' ? null : (
            <>
              <View style={[styles.section, { backgroundColor: cardBg, borderColor: hair }]}>
                <ThemedText style={[styles.sectionLabel, { color: textSub }]}>VEHICLE DETAILS</ThemedText>
                <Field label="License plate" value={licensePlate} onChange={setLicensePlate} placeholder="RAB 123 A" textPri={textPri} textSub={textSub} hair={hair} inputBg={inputBg} />
                <Field label="Car model" value={carModel} onChange={setCarModel} placeholder="Toyota RAV4" textPri={textPri} textSub={textSub} hair={hair} inputBg={inputBg} />
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>Car color</ThemedText>
                <TextInput
                  value={carColor}
                  onChangeText={setCarColor}
                  placeholder="Silver"
                  placeholderTextColor={textSub}
                  style={[styles.input, { color: textPri, borderColor: hair, backgroundColor: inputBg }]}
                />
                <View style={styles.colorChips}>
                  {CAR_COLOR_SUGGESTIONS.map(c => (
                    <Pressable
                      key={c}
                      onPress={() => setCarColor(c)}
                      style={[styles.chip, { borderColor: carColor === c ? TEAL : hair, backgroundColor: carColor === c ? TEAL + '18' : inputBg }]}
                    >
                      <ThemedText style={[styles.chipText, { color: carColor === c ? TEAL : textPri }]}>{c}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {photosOptional && !photosRequired ? (
                <View style={[styles.devBanner, { backgroundColor: TEAL + '14', borderColor: TEAL + '40' }]}>
                  <IconSymbol name="doc.text.fill" size={16} color={TEAL} />
                  <ThemedText style={[styles.devBannerText, { color: textSub }]}>
                    {Platform.OS === 'web'
                      ? 'You can attach photos below using your browser.'
                      : 'Photos are optional in this dev build. Vehicle details are enough to apply — add photos when you install the Play test app.'}
                  </ThemedText>
                </View>
              ) : null}

              {isVerificationPhotoPickAvailable() ? (
                <>
                  <UploadCard
                    title="Driving license"
                    hint="Clear photo of your valid Rwanda driving license"
                    image={licenseImage}
                    onPick={() => pickImage('license')}
                    optional={photosOptional && !photosRequired}
                    cardBg={cardBg}
                    hair={hair}
                    textPri={textPri}
                    textSub={textSub}
                    inputBg={inputBg}
                  />
                  <UploadCard
                    title="Car with license plate"
                    hint="Photo of your car showing the plate clearly"
                    image={carImage}
                    onPick={() => pickImage('car')}
                    optional={photosOptional && !photosRequired}
                    cardBg={cardBg}
                    hair={hair}
                    textPri={textPri}
                    textSub={textSub}
                    inputBg={inputBg}
                  />
                </>
              ) : null}

              {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

              <Pressable
                onPress={onSubmit}
                disabled={!canSubmit || submitting}
                style={[styles.ctaWrap, { opacity: !canSubmit || submitting ? 0.55 : 1 }]}
              >
                <LinearGradient colors={[TEAL, '#00a896']} style={styles.ctaGrad}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.ctaText}>Submit for review</ThemedText>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textPri,
  textSub,
  hair,
  inputBg,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  textPri: string;
  textSub: string;
  hair: string;
  inputBg: string;
}) {
  return (
    <>
      <ThemedText style={[styles.fieldLabel, { color: textSub }]}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={textSub}
        autoCapitalize="characters"
        style={[styles.input, { color: textPri, borderColor: hair, backgroundColor: inputBg }]}
      />
    </>
  );
}

function UploadCard({
  title,
  hint,
  image,
  onPick,
  optional,
  cardBg,
  hair,
  textPri,
  textSub,
  inputBg,
}: {
  title: string;
  hint: string;
  image: PickedVerificationImage | null;
  onPick: () => void;
  optional?: boolean;
  cardBg: string;
  hair: string;
  textPri: string;
  textSub: string;
  inputBg: string;
}) {
  return (
    <Pressable onPress={onPick} style={[styles.uploadCard, { backgroundColor: cardBg, borderColor: hair }]}>
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={[styles.uploadPlaceholder, { backgroundColor: inputBg }]}>
          <IconSymbol name="camera.fill" size={28} color={textSub} />
        </View>
      )}
      <View style={styles.uploadBody}>
        <ThemedText style={[styles.uploadTitle, { color: textPri }]}>
          {title}{optional ? ' (optional)' : ''}
        </ThemedText>
        <ThemedText style={[styles.uploadHint, { color: textSub }]}>{hint}</ThemedText>
        <ThemedText style={styles.uploadAction}>{image ? 'Tap to replace' : 'Tap to upload'}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  statusCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  statusTitle: { fontSize: 18, fontWeight: '900' },
  statusBody: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  fieldLabel: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '700',
  },
  colorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '800' },
  devBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  devBannerText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  uploadCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
    padding: 12,
    alignItems: 'center',
  },
  preview: { width: 72, height: 72, borderRadius: 12 },
  uploadPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBody: { flex: 1, gap: 4 },
  uploadTitle: { fontSize: 15, fontWeight: '900' },
  uploadHint: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  uploadAction: { color: TEAL, fontSize: 12, fontWeight: '800', marginTop: 4 },
  ctaWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  ctaGrad: { height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  error: { color: DANGER, fontSize: 13, fontWeight: '700' },
});
