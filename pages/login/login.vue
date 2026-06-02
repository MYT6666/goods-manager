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

				<button class="main-btn" @click="login" :loading="loading">
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

				<view class="form-item"
					v-if="selectedRole && (selectedRole.value === 'manager' || selectedRole.value === 'staff')">
					<text class="label">邀请码</text>
					<input type="text" v-model="inviteCode" placeholder="请输入邀请码" class="input" />
				</view>

				<button class="main-btn" @click="register" :loading="loading">
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
				roles: [
					{ label: '店长', value: 'store_manager' },
					{ label: '经理', value: 'manager' },
					{ label: '店员', value: 'staff' }
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

<style lang="scss">
/* ============================================================
   1. 页面容器
   ============================================================ */
.login-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	background: linear-gradient(180deg, #F0F9FA 0%, #FFFFFF 100%);
	padding: 40rpx;
	box-sizing: border-box;
}

.login-box {
	width: 100%;
	max-width: 600rpx;
	background: #FFFFFF;
	border-radius: 24rpx;
	padding: 50rpx 40rpx;
	box-shadow: 0 8rpx 36rpx rgba(0, 0, 0, 0.06);
	box-sizing: border-box;
}

/* ============================================================
   2. Logo 区域
   ============================================================ */
.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 50rpx;
}

.logo-circle {
	width: 150rpx;
	height: 150rpx;
	border-radius: 50%;
	overflow: hidden;
	margin-bottom: 24rpx;
	box-shadow: 0 8rpx 28rpx rgba(0, 168, 181, 0.2);
}

.login-logo {
	width: 150rpx;
	height: 150rpx;
}

.login-title {
	font-size: 40rpx;
	font-weight: 700;
	text-align: center;
	color: #1F2937;
	margin-bottom: 8rpx;
}

.login-subtitle {
	font-size: 26rpx;
	color: #9CA3AF;
	text-align: center;
}

/* ============================================================
   3. 表单
   ============================================================ */
.form-item {
	margin-bottom: 28rpx;
	box-sizing: border-box;
}

.label {
	display: block;
	font-size: 26rpx;
	color: #374151;
	margin-bottom: 10rpx;
	font-weight: 500;
}

/* 输入框 —— box-sizing 防溢出 */
.input {
	width: 100%;
	height: 88rpx;
	background: #F9FAFB;
	border-radius: 12px;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #1F2937;
	border: 1px solid #E5E7EB;
	box-sizing: border-box;
	transition: border-color 0.2s, box-shadow 0.2s;

	&:focus {
		border-color: #00A8B5;
		box-shadow: 0 0 0 3rpx rgba(0, 168, 181, 0.08);
	}
}

/* ============================================================
   4. 主按钮 —— 科技蓝绿渐变
   ============================================================ */
.main-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #00A8B5 0%, #007BFF 100%);
	color: #FFFFFF;
	font-size: 32rpx;
	font-weight: 600;
	border-radius: 14rpx;
	margin-top: 20rpx;
	border: none;
	box-shadow: 0 6rpx 24rpx rgba(0, 168, 181, 0.28);
	box-sizing: border-box;

	&:active {
		opacity: 0.85;
	}
}

/* ============================================================
   5. 底部链接
   ============================================================ */
.switch-mode {
	text-align: center;
	margin-top: 28rpx;

	text {
		color: #00A8B5;
		font-size: 26rpx;
		font-weight: 500;

		&:active {
			opacity: 0.6;
		}
	}
}

/* ============================================================
   6. 角色选择
   ============================================================ */
.role-buttons {
	display: flex;
	gap: 14rpx;
}

.role-btn {
	flex: 1;
	height: 76rpx;
	background: #F3F4F6;
	color: #6B7280;
	font-size: 26rpx;
	border-radius: 12rpx;
	border: 1px solid transparent;
	box-sizing: border-box;
	transition: all 0.2s;
}

.role-btn.active {
	background: rgba(0, 168, 181, 0.08);
	color: #007BFF;
	border-color: rgba(0, 168, 181, 0.2);
	font-weight: 600;
}
</style>
