import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, interval, Subscription } from 'rxjs';
import { ApiService, AuthResponse, PermissionDto, RoleDto, RolePermissionDto, TwoFactorChallenge, TwoFactorSettings, UserDetailDto, UserDto, UserRoleDto } from './api.service';
import { TOKEN_KEY } from './api.config';
import { AuthSessionState } from './auth-session-state.service';
import { ExternalAuthProvider, FirebaseAuthService } from './firebase-auth.service';
import { PermissionManagementComponent } from './features/security/permission-management/permission-management.component';
import { RegistrationComponent } from './features/security/registration/registration.component';
import { RolePermissionAssignmentComponent } from './features/security/role-permission-assignment/role-permission-assignment.component';

type Page = 'home'|'login'|'register'|'forgot'|'reset-password'|'verify-email'|'two-factor'|'security-settings'|'dashboard'|'sports'|'teams'|'players'|'profile'|'users'|'roles'|'permissions'|'role-permissions';
interface Sport { name:string; category:string; subs:string[]; status:'Activo'|'Inactivo'; description:string; teams:number; icon:string; }
const PUBLIC_PAGES: Page[] = ['home','login','register','forgot','reset-password','verify-email','two-factor'];
const ADMIN_PAGES: Page[] = ['users','roles','permissions','role-permissions'];
const ADMIN_ROLE = 'administrador';
@Component({ selector:'app-root', standalone:true, imports:[CommonModule, FormsModule, PermissionManagementComponent, RegistrationComponent, RolePermissionAssignmentComponent], templateUrl:'./app.component.html' })
export class AppComponent implements OnInit {
  private api = inject(ApiService);
  private authSessionState = inject(AuthSessionState);
  private firebaseAuth = inject(FirebaseAuthService);
  private destroyRef = inject(DestroyRef);
  get googleLoginEnabled(){ return this.firebaseAuth.enabled; }
  @ViewChild(RolePermissionAssignmentComponent)
  private rolePermissionAssignment?: RolePermissionAssignmentComponent;

  page: Page = 'home';
  mobileMenu = false;
  toast = '';
  search = '';
  statusFilter = 'Todos';

  /* ---------- Deportes (datos de demostración: el backend aún no tiene este módulo) ---------- */
  selectedSport = 0;
  modal = false;
  editingSport = false;
  sportForm: Sport = this.blankSport();
  sports: Sport[] = [
    {name:'Fútbol',category:'Balón',subs:['Fútbol 11','Fútbol de salón','Fútbol callejero','Fútbol playa','Fútbol 5'],status:'Activo',description:'Deporte de equipo jugado entre dos conjuntos de once jugadores cada uno.',teams:12,icon:'⚽'},
    {name:'Baloncesto',category:'Balón',subs:['Baloncesto 5x5','Baloncesto 3x3'],status:'Activo',description:'Deporte de equipo en el que se busca introducir el balón en la canasta rival.',teams:8,icon:'🏀'},
    {name:'Voleibol',category:'Red',subs:['Voleibol de sala','Voleibol playa','Voleibol sentado'],status:'Activo',description:'Deporte de equipo en el que dos conjuntos se enfrentan separados por una red.',teams:10,icon:'🏐'},
    {name:'Tenis',category:'Raqueta',subs:['Tenis individual','Tenis dobles'],status:'Inactivo',description:'Deporte de raqueta que se disputa en una pista dividida por una red.',teams:4,icon:'🎾'},
    {name:'Natación',category:'Acuático',subs:['Natación en piscina'],status:'Activo',description:'Disciplina acuática de velocidad, resistencia y técnica.',teams:6,icon:'🌊'}
  ];

  /* ---------- Sesión ---------- */
  session: AuthResponse | null = null;
  loginEmail=''; loginPassword='';
  authLoading = false;
  verificationEmail = '';
  verificationProvider: ExternalAuthProvider = 'google';
  verificationMessage = '';
  verificationError = '';
  forgotEmail = '';
  recoveryLoading = false;
  recoveryMessage = '';
  recoveryError = '';
  newPassword = '';
  confirmNewPassword = '';
  resetComplete = false;
  private resetToken = '';
  twoFactorChallenge: TwoFactorChallenge | null = null;
  twoFactorSettings: TwoFactorSettings | null = null;
  twoFactorPassword = '';
  twoFactorCode = '';
  twoFactorBusy = false;
  twoFactorError = '';
  twoFactorMessage = '';
  twoFactorRemaining = 0;
  twoFactorResendRemaining = 0;
  private twoFactorTimer?: Subscription;

  /* ---------- Datos de seguridad (vienen del backend) ---------- */
  apiUsers: UserDto[] = [];
  apiRoles: RoleDto[] = [];
  apiPermissions: PermissionDto[] = [];
  allUserRoles: UserRoleDto[] = [];
  allRolePerms: RolePermissionDto[] = [];
  dataLoading = false;
  detailUser: UserDto | null = null;
  userDetail: UserDetailDto | null = null;
  detailLoading = false;
  detailError = '';

  /* ---------- Selección de rol desde otras pantallas administrativas ---------- */
  requestedRoleId: number | null = null;

  /* ---------- Modales de administración ---------- */
  saving = false;
  formError = '';
  userModal = false;
  userForm = { id: null as number|null, name:'', email:'', password:'', phone:'', birthDate:'', profileId: null as number|null, roleIds: [] as number[] };
  roleModal = false;
  roleForm = { id: null as number|null, name:'', description:'' };
  /* ---------- Perfil propio ---------- */
  profileForm = { name:'', email:'', password:'', currentPassword:'', phone:'', birthDate:'', profileId: null as number|null };
  profileError = '';

  ngOnInit(){
    this.openPasswordResetLink();
    this.authSessionState.invalidated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(()=>this.handleSessionExpired());
    // An old session must not interrupt a public recovery link with an expiry redirect.
    if (this.page !== 'reset-password') this.restoreSession();
  }

  private openPasswordResetLink(){
    const prefix = '#reset-password=';
    if (!window.location.hash.startsWith(prefix)) return;
    const token = window.location.hash.slice(prefix.length);
    // Keep the recovery secret only in component memory, never in history or localStorage.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    this.page = 'reset-password';
    if (/^[A-Za-z0-9_-]{43}$/.test(token)) this.resetToken = token;
    else this.recoveryError = 'El enlace no es válido. Solicita uno nuevo.';
  }

  async requestPasswordRecovery(){
    if (this.recoveryLoading) return;
    this.recoveryError = '';
    this.recoveryMessage = '';
    this.recoveryLoading = true;
    try {
      await firstValueFrom(this.api.forgotPassword(this.forgotEmail.trim()));
      this.recoveryMessage = 'Si existe una cuenta que puede recuperar su contraseña, recibirás un correo con las instrucciones';
    } catch (error: unknown) {
      this.recoveryError = this.api.errorMessage(error);
    } finally {
      this.recoveryLoading = false;
    }
  }

  async resetRecoveredPassword(){
    if (this.recoveryLoading || this.resetComplete) return;
    this.recoveryError = '';
    if (!this.resetToken) {
      this.recoveryError = 'El enlace no es válido. Solicita uno nuevo.';
      return;
    }
    if (!this.newPassword.trim() || this.newPassword.length < 8) {
      this.recoveryError = 'La contraseña debe tener mínimo 8 caracteres y no puede contener solo espacios.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.recoveryError = 'Las contraseñas no coinciden.';
      return;
    }
    this.recoveryLoading = true;
    try {
      await firstValueFrom(this.api.resetPassword(this.resetToken, this.newPassword));
      this.resetComplete = true;
      this.resetToken = '';
      this.recoveryMessage = 'Contraseña actualizada. Tus sesiones anteriores se cerraron. Inicia sesión con tu nueva contraseña.';
    } catch (error: unknown) {
      this.recoveryError = this.api.errorMessage(error);
    } finally {
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.recoveryLoading = false;
    }
  }

  /* ======================= Sesión ======================= */
  get isAdmin(){ return !!this.session?.roles.some(r=>r.name.toLowerCase()===ADMIN_ROLE); }
  get adminMode(){ return this.isAdmin; }
  get displayName(){ return this.session?.user.name ?? 'Invitado'; }
  get firstName(){ return (this.session?.user.name ?? '').trim().split(/\s+/)[0] ?? ''; }
  get myInitials(){ return this.session ? this.initials(this.session.user.name) : '··'; }
  get displayRole(){
    if(!this.session) return 'Sin sesión';
    if(this.isAdmin) return 'Administrador del sistema';
    return this.session.roles.map(r=>r.name).join(', ') || 'Sin rol asignado';
  }
  initials(name:string){ const p=name.trim().split(/\s+/).filter(Boolean); return ((p[0]?.[0] ?? '')+(p.length>1?(p[p.length-1][0] ?? ''):(p[0]?.[1] ?? ''))).toUpperCase(); }

  restoreSession(){
    if(!localStorage.getItem(TOKEN_KEY)) return;
    this.api.me().subscribe({
      next:r=>{ this.session=r; if(this.page==='home') this.nav('dashboard'); },
      error:e=>{ if((e as HttpErrorResponse).status!==401) this.showToast(this.api.errorMessage(e)); }
    });
  }
  refreshSession(){
    this.api.me().subscribe({
      next:r=>{ this.session=r; },
      error:e=>{ if((e as HttpErrorResponse).status!==401) this.showToast(this.api.errorMessage(e)); }
    });
  }
  private handleSessionExpired(){
    const hadLocalSession=!!this.session || !!localStorage.getItem(TOKEN_KEY);
    if (!hadLocalSession) return;
    localStorage.removeItem(TOKEN_KEY);
    this.session=null;
    this.apiUsers=[]; this.apiRoles=[]; this.apiPermissions=[]; this.allUserRoles=[]; this.allRolePerms=[];
    this.loginPassword='';
    this.profileForm.password='';
    this.profileForm.currentPassword='';
    this.clearTwoFactor();
    this.userForm.password='';
    this.userModal=false; this.roleModal=false;
    this.detailUser=null; this.userDetail=null;
    this.page='login';
    this.mobileMenu=false;
    if(hadLocalSession) this.showToast('Tu sesión expiró. Inicia sesión nuevamente.');
  }
  startSession(r:AuthResponse, message:string){
    localStorage.setItem(TOKEN_KEY, r.token);
    this.session=r; this.loginPassword='';
    this.nav('dashboard'); this.showToast(message);
  }
  onRegistrationSuccess(response: AuthResponse): void {
    this.startSession(response, 'Cuenta creada correctamente. ¡Bienvenido!');
  }
  login(){
    if (this.authLoading) return;
    if(!this.loginEmail.trim()||!this.loginPassword){this.showToast('Ingresa tu correo y contraseña.');return;}
    this.authLoading=true;
    this.api.login({email:this.loginEmail.trim(),password:this.loginPassword}).subscribe({
      next:r=>{
        this.authLoading=false;
        if ('twoFactorRequired' in r) {
          this.loginPassword=''; this.setTwoFactorChallenge(r); this.nav('two-factor');
        } else this.startSession(r,`Bienvenido, ${r.user.name}.`);
      },
      error:e=>{ this.authLoading=false; this.showToast(this.api.errorMessage(e)); }
    });
  }
  googleLogin(){ return this.oauthLogin('google'); }
  private setTwoFactorChallenge(challenge: TwoFactorChallenge){
    this.twoFactorTimer?.unsubscribe();
    this.twoFactorChallenge = challenge; this.twoFactorCode = ''; this.twoFactorError = '';
    this.twoFactorMessage = 'Código enviado. Revisa tu correo y la carpeta de spam.';
    const expires = Date.now() + challenge.expiresInSeconds * 1000;
    const resend = Date.now() + challenge.resendAfterSeconds * 1000;
    const tick = () => {
      this.twoFactorRemaining = Math.max(0, Math.ceil((expires-Date.now())/1000));
      this.twoFactorResendRemaining = Math.max(0, Math.ceil((resend-Date.now())/1000));
    };
    tick();
    this.twoFactorTimer = interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(tick);
  }
  get twoFactorTime(){ return `${Math.floor(this.twoFactorRemaining/60)}:${String(this.twoFactorRemaining%60).padStart(2,'0')}`; }
  private clearTwoFactor(){
    this.twoFactorTimer?.unsubscribe(); this.twoFactorChallenge=null; this.twoFactorCode='';
    this.twoFactorPassword=''; this.twoFactorError=''; this.twoFactorMessage='';
  }
  async loadTwoFactorSettings(){
    this.twoFactorSettings=null; this.twoFactorError=''; this.twoFactorBusy=true;
    try { this.twoFactorSettings=await firstValueFrom(this.api.twoFactorSettings()); }
    catch(error: unknown){ this.twoFactorError=this.api.errorMessage(error); }
    finally { this.twoFactorBusy=false; }
  }
  async requestTwoFactorChange(){
    if(this.twoFactorBusy || !this.twoFactorSettings || !this.twoFactorPassword) return;
    this.twoFactorBusy=true; this.twoFactorError='';
    try {
      const challenge=await firstValueFrom(this.api.requestTwoFactorChange(this.twoFactorPassword,!this.twoFactorSettings.enabled));
      this.setTwoFactorChallenge(challenge);
    } catch(error: unknown){ this.twoFactorError=this.api.errorMessage(error); }
    finally { this.twoFactorPassword=''; this.twoFactorBusy=false; }
  }
  async verifyTwoFactor(){
    const challenge=this.twoFactorChallenge;
    if(this.twoFactorBusy || !challenge || !/^\d{6}$/.test(this.twoFactorCode)) return;
    this.twoFactorBusy=true; this.twoFactorError='';
    try {
      const result=await firstValueFrom(this.api.verifyTwoFactor(challenge.challengeId,this.twoFactorCode,challenge.purpose!=='LOGIN'));
      this.clearTwoFactor();
      this.twoFactorBusy=false;
      if('token' in result) this.startSession(result,`Bienvenido, ${result.user.name}.`);
      else {
        this.twoFactorSettings=result;
        // Settings changes revoke every existing session, including this one, deliberately.
        this.session=null; this.logout(); this.nav('login');
        this.showToast(`2FA ${result.enabled ? 'activado' : 'desactivado'}. Inicia sesión nuevamente.`);
      }
    } catch(error: unknown){ this.twoFactorError=this.api.errorMessage(error); }
    finally { this.twoFactorCode=''; this.twoFactorBusy=false; }
  }
  async resendTwoFactor(){
    const challenge=this.twoFactorChallenge;
    if(this.twoFactorBusy || !challenge || this.twoFactorResendRemaining>0 || !this.twoFactorRemaining) return;
    this.twoFactorBusy=true; this.twoFactorError='';
    try { this.setTwoFactorChallenge(await firstValueFrom(this.api.resendTwoFactor(challenge.challengeId,challenge.purpose!=='LOGIN'))); }
    catch(error: unknown){ this.twoFactorError=this.api.errorMessage(error); }
    finally { this.twoFactorBusy=false; }
  }
  async cancelTwoFactor(){
    const challenge=this.twoFactorChallenge;
    if(this.twoFactorBusy || !challenge) return;
    this.twoFactorBusy=true;
    try {
      await firstValueFrom(this.api.cancelTwoFactor(challenge.challengeId,challenge.purpose!=='LOGIN'));
      this.clearTwoFactor();
      this.twoFactorBusy=false;
      if(challenge.purpose==='LOGIN') this.nav('login');
    } catch(error: unknown){ this.twoFactorError=this.api.errorMessage(error); }
    finally { this.twoFactorBusy=false; }
  }
  async oauthLogin(provider: ExternalAuthProvider){
    if (!this.googleLoginEnabled || this.authLoading) return;
    if (!this.firebaseAuth.enabled) {
      this.showToast('El acceso OAuth no está configurado.');
      return;
    }
    this.authLoading=true;
    try {
      const identity = await this.firebaseAuth.obtainIdentityToken(provider);
      if (identity.status === 'verification-required') {
        this.verificationEmail = identity.email;
        this.verificationProvider = identity.provider;
        this.verificationMessage = '';
        this.verificationError = '';
        this.nav('verify-email');
        return;
      }
      await this.completeOAuthLogin(identity.idToken);
    } catch (error: unknown) {
      this.showToast(error instanceof HttpErrorResponse
        ? this.api.errorMessage(error) : this.firebaseAuth.errorMessage(error, provider));
    } finally {
      this.authLoading=false;
    }
  }
  async sendVerificationEmail(){
    if (this.authLoading) return;
    this.authLoading = true;
    this.verificationMessage = '';
    this.verificationError = '';
    try {
      await this.firebaseAuth.sendPendingVerification();
      this.verificationMessage = 'Correo enviado. Revisa tu bandeja de entrada y spam. Abre el enlace y luego pulsa «Ya verifiqué mi correo». Espera 60 segundos antes de reenviar.';
    } catch (error: unknown) {
      this.verificationError = this.firebaseAuth.errorMessage(error, this.verificationProvider, true);
    } finally {
      this.authLoading = false;
    }
  }
  async confirmVerificationEmail(){
    if (this.authLoading) return;
    this.authLoading = true;
    this.verificationMessage = '';
    this.verificationError = '';
    try {
      const identity = await this.firebaseAuth.confirmPendingVerification();
      await this.completeOAuthLogin(identity.idToken);
    } catch (error: unknown) {
      this.verificationError = error instanceof HttpErrorResponse
        ? this.api.errorMessage(error)
        : this.firebaseAuth.errorMessage(error, this.verificationProvider, true);
    } finally {
      this.authLoading = false;
    }
  }
  async cancelVerificationEmail(){
    if (this.authLoading) return;
    this.authLoading = true;
    try {
      await this.firebaseAuth.signOut();
      this.verificationEmail = '';
      this.nav(this.session ? 'dashboard' : 'login');
    } catch (error: unknown) {
      this.verificationError = this.firebaseAuth.errorMessage(error, this.verificationProvider, true);
    } finally {
      this.authLoading = false;
    }
  }
  private async completeOAuthLogin(idToken: string){
    const response = await firstValueFrom(this.api.exchangeFirebaseGoogleToken({idToken}));
    await this.firebaseAuth.signOut().catch(()=>undefined);
    this.verificationEmail = '';
    this.startSession(response, `Bienvenido, ${response.user.name}.`);
  }
  logout(){
    if(this.twoFactorBusy) return;
    this.clearTwoFactor(); this.twoFactorSettings=null;
    if(this.session) this.api.logout().subscribe({
      error:()=>this.showToast('La sesión se cerró localmente, pero no se pudo confirmar el cierre en el servidor.')
    });
    localStorage.removeItem(TOKEN_KEY);
    void this.firebaseAuth.signOut().catch(()=>undefined);
    this.session=null; this.apiUsers=[]; this.apiRoles=[]; this.apiPermissions=[]; this.allUserRoles=[]; this.allRolePerms=[];
    this.nav('home'); this.showToast('Sesión cerrada.');
  }

  /* ======================= Navegación ======================= */
  nav(page:Page){
    if (this.twoFactorBusy && (this.page==='two-factor' || this.page==='security-settings')) return;
    if (page !== this.page && this.twoFactorChallenge && (this.page==='two-factor' || this.page==='security-settings')) {
      // Leaving abandons this flow. No session has been created for a login challenge.
      const challenge=this.twoFactorChallenge;
      this.api.cancelTwoFactor(challenge.challengeId,challenge.purpose!=='LOGIN').subscribe({error:()=>undefined});
      this.clearTwoFactor();
    }
    if(!PUBLIC_PAGES.includes(page) && !this.session){ this.page='login'; this.mobileMenu=false; this.showToast('Inicia sesión para continuar.'); return; }
    if(ADMIN_PAGES.includes(page) && !this.isAdmin){ this.mobileMenu=false; this.showToast('Necesitas el rol Administrador para acceder a Seguridad.'); return; }
    if(page===this.page && page==='role-permissions'){ this.mobileMenu=false; return; }
    if(this.page==='role-permissions' && this.rolePermissionAssignment
      && !this.rolePermissionAssignment.confirmAbandonPendingChanges()) return;
    if (page !== this.page && (this.page === 'reset-password' || this.page === 'forgot')) {
      this.resetToken = ''; this.newPassword = ''; this.confirmNewPassword = '';
      this.recoveryMessage = ''; this.recoveryError = ''; this.resetComplete = false;
    }
    this.page=page; this.mobileMenu=false; this.toast=''; this.search='';
    if(ADMIN_PAGES.includes(page)) this.loadAdminData();
    if(page==='profile') this.loadMyProfile();
    if(page==='security-settings') void this.loadTwoFactorSettings();
  }
  openAdmin(){ this.nav('role-permissions'); }
  isAdminPage():boolean{ return ADMIN_PAGES.includes(this.page); }
  showToast(message:string){this.toast=message;setTimeout(()=>{if(this.toast===message)this.toast='';},3500);}

  /* ======================= Carga de datos de seguridad ======================= */
  loadAdminData(){
    this.dataLoading=true;
    forkJoin({
      users:this.api.getUsers(), roles:this.api.getRoles(), permissions:this.api.getPermissions(),
      userRoles:this.api.getUserRoles(), rolePerms:this.api.getRolePermissions()
    }).subscribe({
      next:d=>{
        this.apiUsers=d.users; this.apiRoles=d.roles; this.apiPermissions=d.permissions;
        this.allUserRoles=d.userRoles; this.allRolePerms=d.rolePerms;
        this.dataLoading=false;
      },
      error:e=>{ this.dataLoading=false; this.showToast(this.api.errorMessage(e)); }
    });
  }
  rolesOfUser(userId:number):RoleDto[]{ return this.allUserRoles.filter(ur=>ur.userId===userId).map(ur=>ur.role); }
  roleNamesOfUser(userId:number):string{ return this.rolesOfUser(userId).map(r=>r.name).join(', ') || 'Sin rol'; }
  userCountOfRole(roleId:number):number{ return this.allUserRoles.filter(ur=>ur.role.id===roleId).length; }
  permCountOfRole(roleId:number):number{ return this.allRolePerms.filter(rp=>rp.roleId===roleId).length; }

  /* Listados filtrados por el buscador */
  get filteredUsers(){ const q=this.search.toLowerCase(); return this.apiUsers.filter(u=>(u.name+' '+u.email).toLowerCase().includes(q)); }
  get filteredRoles(){ const q=this.search.toLowerCase(); return this.apiRoles.filter(r=>(r.name+' '+r.description).toLowerCase().includes(q)); }
  /* Tarjetas de estadísticas */
  get usersWithRole(){ return this.apiUsers.filter(u=>this.allUserRoles.some(ur=>ur.userId===u.id)).length; }
  get rolesWithUsers(){ return this.apiRoles.filter(r=>this.userCountOfRole(r.id)>0).length; }
  get permsInUse(){ return this.apiPermissions.filter(p=>this.allRolePerms.some(rp=>rp.permission.id===p.id)).length; }

  /* ======================= Usuarios ======================= */
  openUserDetail(user:UserDto){
    this.detailUser=user;
    this.userDetail=null;
    this.detailError='';
    this.detailLoading=true;
    this.api.getUserDetail(user.id).subscribe({
      next:detail=>{
        if(this.detailUser?.id===user.id){
          this.userDetail=detail;
          this.detailLoading=false;
        }
      },
      error:error=>{
        if(this.detailUser?.id===user.id){
          this.detailError=this.api.errorMessage(error);
          this.detailLoading=false;
        }
      }
    });
  }
  closeUserDetail(){ this.detailUser=null; this.userDetail=null; this.detailError=''; this.detailLoading=false; }
  openNewUser(){
    this.userForm={id:null,name:'',email:'',password:'',phone:'',birthDate:'',profileId:null,roleIds:[]};
    this.formError=''; this.userModal=true;
  }
  openEditUser(u:UserDto){
    this.userForm={id:u.id,name:u.name,email:u.email,password:'',phone:'',birthDate:'',profileId:null,roleIds:this.rolesOfUser(u.id).map(r=>r.id)};
    this.formError=''; this.userModal=true;
    this.api.getUserDetail(u.id).subscribe({
      next:d=>{ if(this.userForm.id===u.id){ this.userForm.phone=d.profile?.phone ?? ''; this.userForm.birthDate=d.profile?.birthDate ?? ''; this.userForm.profileId=d.profile?.id ?? null; } },
      error:e=>{ this.formError=this.api.errorMessage(e); }
    });
  }
  toggleFormRole(roleId:number){
    const ids=this.userForm.roleIds;
    this.userForm.roleIds = ids.includes(roleId) ? ids.filter(i=>i!==roleId) : [...ids, roleId];
  }
  async saveUser(){
    const f=this.userForm; this.formError='';
    if(f.name.trim().length<2){this.formError='El nombre debe tener al menos 2 caracteres.';return;}
    if(!/^\S+@\S+\.\S+$/.test(f.email.trim())){this.formError='Ingresa un correo electrónico válido.';return;}
    if(f.id===null && f.password.length<8){this.formError='La contraseña debe tener mínimo 8 caracteres.';return;}
    if(f.id!==null && f.password && f.password.length<8){this.formError='La nueva contraseña debe tener mínimo 8 caracteres.';return;}
    const hasPhone=!!f.phone.trim(), hasBirth=!!f.birthDate;
    if(hasPhone!==hasBirth){this.formError='Para guardar el perfil completa teléfono y fecha de nacimiento (o deja ambos vacíos).';return;}
    if(hasPhone && (f.phone.trim().length<7||f.phone.trim().length>20)){this.formError='El teléfono debe tener entre 7 y 20 caracteres.';return;}
    this.saving=true;
    try{
      let userId:number;
      if(f.id===null){
        const created=await firstValueFrom(this.api.createUser({name:f.name.trim(),email:f.email.trim(),password:f.password}));
        userId=created.id; f.id=created.id;   // si algo falla después, reintentar actualiza en vez de duplicar
      }else{
        const body:{name:string;email:string;password?:string}={name:f.name.trim(),email:f.email.trim()};
        if(f.password) body.password=f.password;
        await firstValueFrom(this.api.updateUser(f.id,body));
        userId=f.id;
      }
      const current=new Set(this.rolesOfUser(userId).map(r=>r.id));
      const wanted=new Set(f.roleIds);
      for(const roleId of wanted){ if(!current.has(roleId)) await firstValueFrom(this.api.assignRole(userId,roleId)); }
      for(const roleId of current){ if(!wanted.has(roleId)) await firstValueFrom(this.api.unassignRole(userId,roleId)); }
      if(hasPhone){
        if(f.profileId!==null) await firstValueFrom(this.api.updateProfile(f.profileId,{phone:f.phone.trim(),birthDate:f.birthDate}));
        else { const p=await firstValueFrom(this.api.createProfile({userId,phone:f.phone.trim(),birthDate:f.birthDate})); f.profileId=p.id; }
      }
      this.userModal=false;
      this.showToast('Usuario guardado correctamente.');
      this.loadAdminData();
      if(this.session?.user.id===userId) this.refreshSession();
    }catch(e){
      this.formError=this.api.errorMessage(e);
      this.loadAdminData();
    }finally{ this.saving=false; }
  }
  deleteUser(u:UserDto){
    if(this.session?.user.id===u.id){this.showToast('No puedes eliminar tu propia cuenta.');return;}
    if(!confirm(`¿Eliminar al usuario ${u.name}? También se eliminarán su perfil y sus sesiones.`)) return;
    this.api.deleteUser(u.id).subscribe({
      next:()=>{ this.showToast('Usuario eliminado.'); this.loadAdminData(); },
      error:e=>this.showToast(this.api.errorMessage(e))
    });
  }

  /* ======================= Roles ======================= */
  openNewRole(){ this.roleForm={id:null,name:'',description:''}; this.formError=''; this.roleModal=true; }
  openEditRole(r:RoleDto){ this.roleForm={id:r.id,name:r.name,description:r.description}; this.formError=''; this.roleModal=true; }
  saveRole(){
    const f=this.roleForm; this.formError='';
    if(!f.name.trim()||!f.description.trim()){this.formError='El nombre y la descripción del rol son obligatorios.';return;}
    const body={name:f.name.trim(),description:f.description.trim()};
    this.saving=true;
    const request = f.id===null ? this.api.createRole(body) : this.api.updateRole(f.id,body);
    request.subscribe({
      next:()=>{ this.saving=false; this.roleModal=false; this.showToast('Rol guardado correctamente.'); this.loadAdminData(); if(this.isAdmin) this.refreshSession(); },
      error:e=>{ this.saving=false; this.formError=this.api.errorMessage(e); }
    });
  }
  deleteRole(r:RoleDto){
    if(!confirm(`¿Eliminar el rol ${r.name}?`)) return;
    this.api.deleteRole(r.id).subscribe({
      next:()=>{ this.showToast('Rol eliminado.'); if(this.requestedRoleId===r.id) this.requestedRoleId=null; this.loadAdminData(); },
      error:e=>this.showToast(this.api.errorMessage(e))
    });
  }
  openRolePermissions(r:RoleDto){ this.requestedRoleId=r.id; this.nav('role-permissions'); }

  /* ======================= Permisos ======================= */
  onRolePermissionsChanged(event:{roleId:number;rolePermissions:RolePermissionDto[]}){
    this.allRolePerms=[
      ...this.allRolePerms.filter(rolePermission=>rolePermission.roleId!==event.roleId),
      ...event.rolePermissions
    ];
    this.refreshSession();
  }

  /* ======================= Perfil propio ======================= */
  loadMyProfile(){
    if(!this.session) return;
    const user=this.session.user;
    this.profileForm={name:user.name,email:user.email,password:'',currentPassword:'',phone:'',birthDate:'',profileId:null};
    this.profileError='';
    this.api.getMyUserDetail().subscribe({
      next:d=>{ this.profileForm.phone=d.profile?.phone ?? ''; this.profileForm.birthDate=d.profile?.birthDate ?? ''; this.profileForm.profileId=d.profile?.id ?? null; },
      error:e=>{ this.profileError=this.api.errorMessage(e); }
    });
  }
  async saveMyProfile(){
    if(!this.session) return;
    const f=this.profileForm; this.profileError='';
    if(f.name.trim().length<2){this.profileError='El nombre debe tener al menos 2 caracteres.';return;}
    if(!/^\S+@\S+\.\S+$/.test(f.email.trim())){this.profileError='Ingresa un correo electrónico válido.';return;}
    if(f.password && f.password.length<8){this.profileError='La nueva contraseña debe tener mínimo 8 caracteres.';return;}
    const hasPhone=!!f.phone.trim(), hasBirth=!!f.birthDate;
    if(hasPhone!==hasBirth){this.profileError='Completa teléfono y fecha de nacimiento (o deja ambos vacíos).';return;}
    if(hasPhone && (f.phone.trim().length<7||f.phone.trim().length>20)){this.profileError='El teléfono debe tener entre 7 y 20 caracteres.';return;}
    this.saving=true;
    try{
      const body:{name:string;email:string;password?:string;currentPassword?:string}={name:f.name.trim(),email:f.email.trim()};
      if(f.currentPassword) body.currentPassword=f.currentPassword;
      if(f.password) body.password=f.password;
      const updated=await firstValueFrom(this.api.updateMyUser(body));
      this.session={...this.session,user:updated};
      if(hasPhone){
        const profile=await firstValueFrom(this.api.saveMyProfile({phone:f.phone.trim(),birthDate:f.birthDate}));
        f.profileId=profile.id;
      }
      f.password='';
      this.showToast('Perfil actualizado correctamente.');
    }catch(e){ this.profileError=this.api.errorMessage(e); }
    finally{ this.profileForm.currentPassword=''; this.saving=false; }
  }

  /* ======================= Deportes (demostración) ======================= */
  get filteredSports(){return this.sports.filter(s=>(s.name.toLowerCase().includes(this.search.toLowerCase())||s.category.toLowerCase().includes(this.search.toLowerCase()))&&(this.statusFilter==='Todos'||s.status===this.statusFilter));}
  get currentSport(){return this.sports[this.selectedSport] ?? this.sports[0];}
  blankSport():Sport{return {name:'',category:'',subs:[],status:'Activo',description:'',teams:0,icon:'🏅'};}
  openNewSport(){this.sportForm=this.blankSport();this.editingSport=false;this.modal=true;}
  openEditSport(s:Sport){this.sportForm={...s,subs:[...s.subs]};this.editingSport=true;this.modal=true;}
  updateSubs(value:string){this.sportForm.subs=value.split(',').map(s=>s.trim()).filter(Boolean);}
  saveSport(){if(!this.sportForm.name.trim()||!this.sportForm.category){this.showToast('Completa el nombre y la categoría del deporte.');return;}const duplicate=this.sports.some((s,i)=>s.name.toLowerCase()===this.sportForm.name.trim().toLowerCase()&&(!this.editingSport||i!==this.selectedSport));if(duplicate){this.showToast('Ya existe un deporte con ese nombre.');return;}if(this.editingSport)this.sports[this.selectedSport]={...this.sportForm};else{this.sports.push({...this.sportForm});this.selectedSport=this.sports.length-1;}this.modal=false;this.showToast('Deporte guardado correctamente.');}
  deleteSport(index:number){const s=this.sports[index];if(s.teams>0){this.showToast(`No se puede eliminar «${s.name}» porque tiene equipos asociados.`);return;}if(confirm(`¿Eliminar el deporte ${s.name}?`)){this.sports.splice(index,1);this.selectedSport=0;this.showToast('Deporte eliminado.');}}
  selectSport(s:Sport){this.selectedSport=this.sports.indexOf(s);}
}
