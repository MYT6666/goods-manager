<template>
	<view class="login-container">
		<view class="login-box">
			<!-- Logo 区域 -->
			<view class="logo-section">
				<image class="login-logo" src="/static/logo.jpg" mode="aspectFit"></image>
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
				isRegister: false, // 是否为注册模式
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
			// 获取当前选择的角色
			selectedRole() {
				return this.roles[this.roleIndex];
			}
		},
		methods: {
			// 选择角色
			selectRole(index) {
				this.roleIndex = index;
			},

			// 切换到注册模式
			switchToRegister() {
				this.isRegister = true;
				this.roleIndex = 0;
			},

			// 切换到登录模式
			switchToLogin() {
				this.isRegister = false;
				this.username = '';
				this.password = '';
				this.confirmPassword = '';
				this.inviteCode = '';
			},

			// 登录方法
			async login() {
				// 表单验证
				if (!this.username) {
					uni.showToast({
						title: '请输入用户名',
						icon: 'none'
					});
					return;
				}
				if (!this.password) {
					uni.showToast({
						title: '请输入密码',
						icon: 'none'
					});
					return;
				}

				this.loading = true;
			
			try {
				// 清除可能存在的旧用户信息缓存
				uni.removeStorageSync('userInfo');
				console.log('已清除旧的用户信息缓存');
				
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

					console.log('登录结果:', res);

					if (res.result.code === 0) {
						// 登录成功
						const user = res.result.user;
						console.log('登录成功，用户信息:', user);
						// 将从云函数返回的 user 对象完整存入本地（包含 openid、shop_id）
						uni.setStorageSync('userInfo', user);
						uni.showToast({
							title: '登录成功',
							icon: 'success'
						});

						// 跳转到首页（使用 switchTab 因为 index 是 tabBar 页面）
						uni.switchTab({
							url: '/pages/index/index'
						});
					} else {
						// 登录失败
						uni.showToast({
							title: res.result.message || '登录失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('登录失败:', error);
					uni.showToast({
						title: '网络错误，请重试',
						icon: 'none'
					});
				} finally {
					this.loading = false;
				}
			},

			async register() {
				// 表单验证（保持不变）
				if (!this.username) {
					uni.showToast({
						title: '请输入用户名',
						icon: 'none'
					});
					return;
				}
				if (!this.password) {
					uni.showToast({
						title: '请输入密码',
						icon: 'none'
					});
					return;
				}
				if (this.password !== this.confirmPassword) {
					uni.showToast({
						title: '两次输入的密码不一致',
						icon: 'none'
					});
					return;
				}
				if (!this.selectedRole) {
					uni.showToast({
						title: '请选择角色',
						icon: 'none'
					});
					return;
				}
				if ((this.selectedRole.value === 'manager' || this.selectedRole.value === 'staff') && !this
					.inviteCode) {
					uni.showToast({
						title: '请输入邀请码',
						icon: 'none'
					});
					return;
				}

				this.loading = true;

				try {
					const app = getApp().globalData.cloudbase;
					
					// 检查登录态是否存在，不存在则执行一次匿名登录
					let loginState = await app.auth().getLoginState();
					if (!loginState) {
						console.log('登录态不存在，执行匿名登录...');
						await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
						loginState = await app.auth().getLoginState();
					}
					if (!loginState || !(loginState.user && loginState.user.uid)) {
						this.loading = false;
						uni.showToast({
							title: '登录态无效，请刷新',
							icon: 'none'
						});
						return;
					}
					console.log('登录态信息:', loginState);
					const openid = loginState.user.uid;
					console.log('当前用户 uid:', openid);

					const registerData = {
						username: this.username,
						password: this.password,
						role: this.selectedRole.value,
						openid: openid // 将 openid 作为字段传入
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

					console.log('注册结果:', res);

					if (res.result.code === 0) {
						uni.showToast({
							title: '注册成功，正在登录...',
							icon: 'success'
						});
						// 注册成功后，调用 login 方法时确保传递正确的用户名密码
						await this.login();
					} else {
						uni.showToast({
							title: res.result.message || '注册失败',
							icon: 'none'
						});
					}
				} catch (error) {
					console.error('注册失败:', error);
					uni.showToast({
						title: '网络错误，请重试',
						icon: 'none'
					});
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
		margin-bottom: 40rpx;
	}

	.login-logo {
		width: 150rpx;
		height: 150rpx;
		margin-bottom: 20rpx;
	}

	.login-title {
		font-size: 40rpx;
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
		color: #666;
		margin-bottom: 10rpx;
	}

	.input {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #ddd;
		border-radius: 10rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}

	.login-btn {
		width: 100%;
		height: 80rpx;
		background-color: #007aff;
		color: white;
		font-size: 28rpx;
		border-radius: 10rpx;
		margin-top: 20rpx;
	}

	.switch-mode {
		text-align: center;
		margin-top: 30rpx;
	}

	.switch-mode text {
		color: #007aff;
		font-size: 26rpx;
	}

	.picker {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #ddd;
		border-radius: 10rpx;
		padding: 0 20rpx;
		display: flex;
		align-items: center;
	}

	.picker-text {
		font-size: 28rpx;
		color: #333;
	}

	.role-buttons {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
	}

	.role-btn {
		width: 100%;
		height: 80rpx;
		background-color: #f5f5f5;
		color: #333;
		font-size: 28rpx;
		border-radius: 10rpx;
		border: 1rpx solid #ddd;
	}

	.role-btn.active {
		background-color: #007aff;
		color: white;
		border-color: #007aff;
	}
</style>