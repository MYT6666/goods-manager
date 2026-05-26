<template>
	<view class="login-container">
		<view class="login-box">
			<!-- Logo 区域 -->
			<view class="logo-section">
				<view class="logo-circle">
					<image class="login-logo" src="/static/logo.jpg" mode="aspectFit"></image>
				</view>
				<text class="login-title">商品管理系统</text>
				<text class="login-subtitle">简单高效的商品管理工具</text>
			</view>

			<!-- 登录表单 -->
			<view v-if="!isRegister">
				<view class="form-item">
					<text class="label">用户名</text>
					<input type="text" v-model="username" placeholder="请输入用户名" class="input" />
				</view>

				<view class="form-item">
					<text class="label">密码</text>
					<input type="password" v-model="password" placeholder="请输入密码" class="input" />
				</view>

				<button class="login-btn" @click="login" :loading="loading">
					{{ loading ? '登录中...' : '登录' }}
				</button>

				<view class="switch-mode">
					<text @click="switchToRegister">没有账号？立即注册</text>
				</view>
			</view>

			<!-- 注册表单 -->
			<view v-else>
				<view class="form-item">
					<text class="label">用户名</text>
					<input type="text" v-model="username" placeholder="请输入用户名" class="input" />
				</view>

				<view class="form-item">
					<text class="label">密码</text>
					<input type="password" v-model="password" placeholder="请输入密码" class="input" />
				</view>

				<view class="form-item">
					<text class="label">确认密码</text>
					<input type="password" v-model="confirmPassword" placeholder="请确认密码" class="input" />
				</view>

				<view class="form-item" v-if="roles && roles.length > 0">
					<text class="label">角色</text>
					<view class="role-buttons">
						<button 
							v-for="(role, index) in roles" 
							:key="role.value || index"
							class="role-btn" 
							:class="{ active: roleIndex === index }" 
							@click="selectRole(index)"
							type="default"
						>
							{{ role.label }}
						</button>
					</view>
				</view>

				<!-- 邀请码输入框，当角色为经理或店员时显示 -->
				<view class="form-item"
					v-if="selectedRole && (selectedRole.value === 'manager' || selectedRole.value === 'staff')">
					<text class="label">邀请码</text>
					<input type="text" v-model="inviteCode" placeholder="请输入邀请码" class="input" />
				</view>

				<button class="login-btn" @click="register" :loading="loading">
					{{ loading ? '注册中...' : '注册' }}
				</button>

				<view class="switch-mode">
					<text @click="switchToLogin">已有账号？返回登录</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isRegister: false,
				username: '',
				password: '',
				confirmPassword: '',
				roleIndex: 0,
				inviteCode: '',
				loading: false,
				roles: [{
						label: '店长',
						value: 'store_manager'
					},
					{
						label: '经理',
						value: 'manager'
					},
					{
						label: '店员',
						value: 'staff'
					}
				]
			};
		},
		computed: {
			selectedRole() {
				return this.roles[this.roleIndex];
			}
		},
		methods: {
			selectRole(index) {
				this.roleIndex = index;
			},

			switchToRegister() {
				this.isRegister = true;
				this.roleIndex = 0;
			},

			switchToLogin() {
				this.isRegister = false;
				this.username = '';
				this.password = '';
				this.confirmPassword = '';
				this.inviteCode = '';
			},

			async login() {
				if (!this.username) {
					uni.showToast({ title: '请输入用户名', icon: 'none' });
					return;
				}
				if (!this.password) {
					uni.showToast({ title: '请输入密码', icon: 'none' });
					return;
				}

				this.loading = true;
			
				try {
					uni.removeStorageSync('userInfo');
					
					const app = getApp().globalData.cloudbase;
					const res = await app.callFunction({
						name: 'user-auth',
						data: {
							action: 'login',
							data: {
								username: this.username,
								password: this.password
							}
						}
					});

					if (res.result.code === 0) {
						const user = res.result.user;
						uni.setStorageSync('userInfo', user);
						uni.showToast({ title: '登录成功', icon: 'success' });
						uni.switchTab({ url: '/pages/index/index' });
					} else {
						uni.showToast({ title: res.result.message || '登录失败', icon: 'none' });
					}
				} catch (error) {
					console.error('登录失败:', error);
					uni.showToast({ title: '网络错误，请重试', icon: 'none' });
				} finally {
					this.loading = false;
				}
			},

			async register() {
				if (!this.username) {
					uni.showToast({ title: '请输入用户名', icon: 'none' });
					return;
				}
				if (!this.password) {
					uni.showToast({ title: '请输入密码', icon: 'none' });
					return;
				}
				if (this.password !== this.confirmPassword) {
					uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
					return;
				}
				if (!this.selectedRole) {
					uni.showToast({ title: '请选择角色', icon: 'none' });
					return;
				}
				if ((this.selectedRole.value === 'manager' || this.selectedRole.value === 'staff') && !this.inviteCode) {
					uni.showToast({ title: '请输入邀请码', icon: 'none' });
					return;
				}

				this.loading = true;

				try {
					const app = getApp().globalData.cloudbase;
					
					let loginState = await app.auth().getLoginState();
					if (!loginState) {
						await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
						loginState = await app.auth().getLoginState();
					}
					if (!loginState || !(loginState.user && loginState.user.uid)) {
						this.loading = false;
						uni.showToast({ title: '登录态无效，请刷新', icon: 'none' });
						return;
					}
					const openid = loginState.user.uid;

					const registerData = {
						username: this.username,
						password: this.password,
						role: this.selectedRole.value,
						openid: openid
					};
					if (this.selectedRole.value === 'manager' || this.selectedRole.value === 'staff') {
						registerData.inviteCode = this.inviteCode;
					}

					const res = await app.callFunction({
						name: 'user-auth',
						data: {
							action: 'register',
							data: registerData
						}
					});

					if (res.result.code === 0) {
						uni.showToast({ title: '注册成功，正在登录...', icon: 'success' });
						await this.login();
					} else {
						uni.showToast({ title: res.result.message || '注册失败', icon: 'none' });
					}
				} catch (error) {
					console.error('注册失败:', error);
					uni.showToast({ title: '网络错误，请重试', icon: 'none' });
				} finally {
					this.loading = false;
				}
			}
		}
	};
</script>

<style>
.login-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	background: linear-gradient(180deg, #f0f4f8 0%, #ffffff 100%);
	padding: 40rpx;
}

.login-box {
	width: 100%;
	max-width: 600rpx;
	background-color: white;
	border-radius: 24rpx;
	padding: 50rpx 40rpx;
	box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

/* Logo 区域 */
.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 50rpx;
}

.logo-circle {
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	overflow: hidden;
	margin-bottom: 25rpx;
	box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.3);
	border: 4rpx solid rgba(102, 126, 234, 0.2);
}

.login-logo {
	width: 160rpx;
	height: 160rpx;
}

.login-title {
	font-size: 42rpx;
	font-weight: bold;
	text-align: center;
	color: #333;
	margin-bottom: 10rpx;
}

.login-subtitle {
	font-size: 26rpx;
	color: #999;
	text-align: center;
}

.form-item {
	margin-bottom: 30rpx;
}

.label {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 12rpx;
	font-weight: 500;
}

.input {
	width: 100%;
	height: 90rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 25rpx;
	font-size: 30rpx;
	border: 2rpx solid transparent;
	transition: border-color 0.2s;
}

.input:focus {
	border-color: #667eea;
}

.login-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	font-size: 32rpx;
	font-weight: 500;
	border-radius: 16rpx;
	margin-top: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
}

.switch-mode {
	text-align: center;
	margin-top: 30rpx;
}

.switch-mode text {
	color: #667eea;
	font-size: 26rpx;
}

.role-buttons {
	display: flex;
	gap: 15rpx;
}

.role-btn {
	flex: 1;
	height: 80rpx;
	background-color: #f5f5f5;
	color: #333;
	font-size: 28rpx;
	border-radius: 12rpx;
	border: 2rpx solid transparent;
}

.role-btn.active {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	border-color: transparent;
}
</style>
