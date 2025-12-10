import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { usePasskey } from '@/hooks/usePasskey';
import { useTOTP } from '@/hooks/useTOTP';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, User, Bell, Keyboard, Palette, Loader2, Save, Upload, Fingerprint, Shield, Trash2, Smartphone, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, loading, refetchProfile } = useAuthContext();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const { passkeys, fetchPasskeys, registerPasskey, deletePasskey, loading: passkeyLoading } = usePasskey();
  const { factors, enrollmentData, fetchFactors, startEnrollment, verifyEnrollment, cancelEnrollment, unenroll, loading: totpLoading } = useTOTP();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [formData, setFormData] = useState<{
    full_name: string;
    timezone: string;
    theme: string;
    keyboard_shortcuts_enabled: boolean;
    email_notifications: boolean;
  } | null>(null);

  useEffect(() => {
    if (profile && !formData) {
      setFormData({
        full_name: profile.full_name || '',
        timezone: profile.timezone || 'America/Los_Angeles',
        theme: profile.theme || 'dark',
        keyboard_shortcuts_enabled: profile.keyboard_shortcuts_enabled ?? true,
        email_notifications: profile.email_notifications ?? true,
      });
    }
  }, [profile, formData]);

  useEffect(() => {
    if (user) {
      fetchPasskeys();
      fetchFactors();
    }
  }, [user, fetchPasskeys, fetchFactors]);

  const handleSave = async () => {
    if (!formData) return;
    setSaving(true);
    await updateProfile(formData);
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const avatarUrl = await uploadAvatar(file, user.id);
    if (avatarUrl) {
      await updateProfile({ avatar_url: avatarUrl });
      refetchProfile();
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated',
      });
    }
  };

  const handleAddPasskey = async () => {
    await registerPasskey();
  };

  const handleDeletePasskey = async (id: string) => {
    await deletePasskey(id);
  };

  const handleStartTOTPEnrollment = async () => {
    const result = await startEnrollment();
    if (result.success) {
      setShowEnrollDialog(true);
    }
  };

  const handleVerifyTOTP = async () => {
    if (totpCode.length !== 6) return;
    const result = await verifyEnrollment(totpCode);
    if (result.success) {
      setShowEnrollDialog(false);
      setTotpCode('');
    }
  };

  const handleCancelEnrollment = () => {
    cancelEnrollment();
    setShowEnrollDialog(false);
    setTotpCode('');
  };

  const handleDisableTOTP = async (factorId: string) => {
    await unenroll(factorId);
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const timezones = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  if (loading || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container max-w-4xl py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Palette className="h-4 w-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2">
              <Keyboard className="h-4 w-4" /> Shortcuts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Change Avatar
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => prev ? { ...prev, full_name: e.target.value } : prev)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile?.email || ''} disabled />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData(prev => prev ? { ...prev, timezone: value } : prev)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              {/* Two-Factor Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security using an authenticator app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {verifiedFactors.length === 0 ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Protect your account with TOTP-based two-factor authentication
                        </p>
                      </div>
                      <Button onClick={handleStartTOTPEnrollment} disabled={totpLoading}>
                        {totpLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="mr-2 h-4 w-4" />
                        )}
                        Enable 2FA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {verifiedFactors.map((factor) => (
                        <div 
                          key={factor.id} 
                          className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium">{factor.friendly_name || 'Authenticator App'}</p>
                              <p className="text-xs text-muted-foreground">
                                Added {format(new Date(factor.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDisableTOTP(factor.id)}
                            disabled={totpLoading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive mr-2" />
                            Disable
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Passkeys */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5" />
                        Passkeys
                      </CardTitle>
                      <CardDescription>
                        Sign in securely with biometrics like Face ID, Touch ID, or Windows Hello
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddPasskey} disabled={passkeyLoading}>
                      {passkeyLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Fingerprint className="mr-2 h-4 w-4" />
                      )}
                      Add Passkey
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {passkeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No passkeys registered yet</p>
                      <p className="text-sm">Add a passkey for faster, more secure sign-in</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {passkeys.map((passkey) => (
                        <div 
                          key={passkey.id} 
                          className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Fingerprint className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{passkey.device_type || 'Unknown Device'}</p>
                              <p className="text-xs text-muted-foreground">
                                Added {format(new Date(passkey.created_at), 'MMM d, yyyy')}
                                {passkey.last_used_at && (
                                  <> · Last used {format(new Date(passkey.last_used_at), 'MMM d, yyyy')}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeletePasskey(passkey.id)}
                            disabled={passkeyLoading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={formData.email_notifications}
                    onCheckedChange={(checked) => setFormData(prev => prev ? { ...prev, email_notifications: checked } : prev)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notify me about:</h4>
                  {[
                    { label: 'Show invitations', desc: 'When someone invites you to collaborate' },
                    { label: 'Cue updates', desc: 'When cues are added or modified in your shows' },
                    { label: 'Comments', desc: 'When someone comments on your cues' },
                    { label: 'Mentions', desc: 'When someone mentions you' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-4">
                    <Label>Appearance</Label>
                    <p className="text-sm text-muted-foreground">Choose a color theme for the platform</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'dark', label: 'Default Dark', bg: 'bg-[#1a1625]', accent: 'bg-[#8B5CF6]', text: 'text-white' },
                        { value: 'midnight', label: 'Midnight', bg: 'bg-[#0f172a]', accent: 'bg-[#3B82F6]', text: 'text-white' },
                        { value: 'forest', label: 'Forest', bg: 'bg-[#14261a]', accent: 'bg-[#22C55E]', text: 'text-white' },
                        { value: 'sunset', label: 'Sunset', bg: 'bg-[#271a1a]', accent: 'bg-[#F97316]', text: 'text-white' },
                        { value: 'ocean', label: 'Ocean', bg: 'bg-[#0c1929]', accent: 'bg-[#06B6D4]', text: 'text-white' },
                        { value: 'rose', label: 'Rose', bg: 'bg-[#271a22]', accent: 'bg-[#EC4899]', text: 'text-white' },
                        { value: 'light', label: 'Light', bg: 'bg-[#f8fafc]', accent: 'bg-[#8B5CF6]', text: 'text-slate-900' },
                        { value: 'system', label: 'System', bg: 'bg-gradient-to-br from-[#1a1625] to-[#f8fafc]', accent: 'bg-[#8B5CF6]', text: 'text-white' },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          type="button"
                          onClick={() => setFormData(prev => prev ? { ...prev, theme: theme.value } : prev)}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                            formData.theme === theme.value 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border/50 hover:border-border'
                          }`}
                        >
                          <div className={`w-full h-16 rounded-md ${theme.bg} flex items-center justify-center shadow-inner`}>
                            <div className={`w-6 h-6 rounded-full ${theme.accent}`} />
                          </div>
                          <span className="text-xs font-medium">{theme.label}</span>
                          {formData.theme === theme.value && (
                            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Keyboard Shortcuts</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable keyboard shortcuts for faster navigation
                      </p>
                    </div>
                    <Switch
                      checked={formData.keyboard_shortcuts_enabled}
                      onCheckedChange={(checked) => setFormData(prev => prev ? { ...prev, keyboard_shortcuts_enabled: checked } : prev)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Shortcuts</CardTitle>
                <CardDescription>Quick reference for keyboard shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[
                    { keys: 'Ctrl + N', action: 'Add new cue' },
                    { keys: 'Ctrl + E', action: 'Edit selected cue' },
                    { keys: 'Ctrl + D', action: 'Duplicate selected cue' },
                    { keys: 'Ctrl + C', action: 'Copy selected cue' },
                    { keys: 'Ctrl + V', action: 'Paste cue' },
                    { keys: 'Delete', action: 'Delete selected cue' },
                    { keys: 'Space', action: 'Play/Pause' },
                    { keys: '→', action: 'Next cue' },
                    { keys: 'Ctrl + Z', action: 'Undo' },
                  ].map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm">{shortcut.action}</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* TOTP Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={(open) => !open && handleCancelEnrollment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          {enrollmentData && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img src={enrollmentData.qr} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Can't scan? Enter this code manually:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Enter the 6-digit code from your app</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={totpCode}
                    onChange={(value) => setTotpCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCancelEnrollment}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleVerifyTOTP}
                  disabled={totpLoading || totpCode.length !== 6}
                >
                  {totpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
