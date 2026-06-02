<template>
	<view class="page">
		<!-- ===== 状态栏占位 ===== -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 极简标题 ===== -->
		<view class="page-header">
			<text class="page-title">新增商品</text>
			<text class="page-sub">填写商品信息并保存</text>
		</view>

		<!-- ===== 表单卡片 ===== -->
		<view class="form-card">
			<view class="form-item">
				<text class="form-label">商品名称 <text class="required">*</text></text>
				<input
					type="text"
					v-model="formData.name"
					placeholder="请输入商品名称"
					class="form-input"
					cursor-spacing="20"
				/>
			</view>

			<view class="form-row">
				<view class="form-item half">
					<text class="form-label">进价 <text class="required">*</text></text>
					<view class="input-with-unit">
						<input
							type="digit"
							v-model.number="formData.purchase_price"
							placeholder="0.00"
							class="form-input"
							cursor-spacing="20"
						/>
						<text class="unit">元</text>
					</view>
				</view>
				<view class="form-item half">
					<text class="form-label">卖价 <text class="required">*</text></text>
					<view class="input-with-unit">
						<input
							type="digit"
							v-model.number="formData.selling_price"
							placeholder="0.00"
							class="form-input"
							cursor-spacing="20"
						/>
						<text class="unit">元</text>
					</view>
				</view>
			</view>

			<view class="form-item">
				<text class="form-label">商品条码 <text class="required">*</text></text>
				<view class="barcode-input-row">
					<input
						type="text"
						v-model="formData.barcode"
						placeholder="请输入或扫描商品条码"
						class="form-input barcode-input"
						cursor-spacing="20"
					/>
					<button class="scan-barcode-btn" @click="scanBarcodeForForm">
						<uni-icons type="scan" size="16" color="#FFFFFF"></uni-icons>
						<text>扫码</text>
					</button>
				</view>
			</view>

			<view class="form-item">
				<text class="form-label">商品图片</text>
				<view v-if="!tempImagePath" class="image-picker" @click="chooseImage">
					<uni-icons type="camera" size="36" color="#D1D5DB"></uni-icons>
					<text class="image-picker-text">添加图片</text>
				</view>
				<view v-else class="image-preview">
					<image :src="tempImagePath" mode="aspectFill" class="preview-img" @click="chooseImage"></image>
					<view class="image-delete" @click="removeImage">
						<uni-icons type="closeempty" size="14" color="#FFFFFF"></uni-icons>
					</view>
				</view>
			</view>

			<view class="form-item">
				<text class="form-label">备注</text>
				<textarea
					v-model="formData.remark"
					placeholder="可选填"
					class="form-textarea"
					:maxlength="100"
					cursor-spacing="20"
				/>
				<text class="char-count">{{ (formData.remark && formData.remark.length) || 0 }}/100</text>
			</view>

			<button class="submit-btn" @click="submitForm">保存商品</button>
		</view>

		<!-- ===== 底部导航 ===== -->
		<tab-bar :currentIndex="2"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			statusBarHeight: 0,
			tempImagePath: '',
			formData: {
				name: '',
				barcode: '',
				purchase_price: '',
				selling_price: '',
				image_url: '',
				remark: ''
			}
		};
	},
	onLoad(options) {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		if (options && options.barcode) {
			this.formData.barcode = options.barcode;
		}
		const userInfo = uni.getStorageSync('userInfo');
		if (!userInfo || !userInfo.id || !userInfo.shop_id) {
			uni.reLaunch({ url: '/pages/login/login' });
			return;
		}
	},
	onShow() {
		uni.hideTabBar({ animation: false });
	},
	methods: {
		chooseImage() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const tempPath = res.tempFilePaths[0];
					uni.compressImage({
						src: tempPath,
						quality: 60,
						width: '50%',
						height: '50%',
						success: (compRes) => {
							this.tempImagePath = compRes.tempFilePath;
						},
						fail: () => {
							this.tempImagePath = tempPath;
						}
					});
				}
			});
		},

		removeImage() {
			this.tempImagePath = '';
			this.formData.image_url = '';
		},

		async uploadImage() {
			if (!this.tempImagePath) return;
			const base64 = await this.imageToBase64(this.tempImagePath);
			this.formData.image_url = base64;
		},

		imageToBase64(filePath) {
			return new Promise((resolve, reject) => {
				// #ifdef H5
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					const maxSize = 400;
					let w = img.width, h = img.height;
					if (w > maxSize || h > maxSize) {
						if (w > h) { h = h * maxSize / w; w = maxSize; }
						else { w = w * maxSize / h; h = maxSize; }
					}
					canvas.width = w;
					canvas.height = h;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, w, h);
					resolve(canvas.toDataURL('image/jpeg', 0.6));
				};
				img.onerror = reject;
				img.src = filePath;
				// #endif

				// #ifdef MP-WEIXIN
				const fs = uni.getFileSystemManager();
				const base64 = fs.readFileSync(filePath, 'base64');
				resolve('data:image/jpeg;base64,' + base64);
				// #endif

				// #ifdef APP-PLUS
				plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
					entry.file((file) => {
						const reader = new plus.io.FileReader();
						reader.onloadend = (e) => resolve(e.target.result);
						reader.onerror = reject;
						reader.readAsDataURL(file);
					}, reject);
				}, reject);
				// #endif
			});
		},

		scanBarcodeForForm() {
			// #ifdef H5
			uni.showModal({
				title: '输入条码',
				content: 'H5 环境不支持扫码，请手动输入商品条码',
				editable: true,
				placeholderText: '请输入商品条码',
				success: (res) => {
					if (res.confirm && res.content) {
						this.formData.barcode = res.content.trim();
					}
				}
			});
			// #endif

			// #ifndef H5
			uni.scanCode({
				scanType: ['barCode'],
				onlyFromCamera: true,
				autoDecodeCharSet: true,
				success: (res) => {
					uni.vibrateShort();
					const code = res.result.trim();
					uni.showModal({
						title: '扫码结果',
						content: '识别到的条码：' + code,
						editable: true,
						placeholderText: code,
						success: (modalRes) => {
							if (modalRes.confirm) {
								const finalCode = (modalRes.content && modalRes.content.trim()) || code;
								this.formData.barcode = finalCode;
								uni.showToast({ title: '扫码成功', icon: 'success' });
							}
						}
					});
				},
				fail: () => {
					uni.showToast({ title: '扫码失败', icon: 'none' });
				}
			});
			// #endif
		},

		async submitForm() {
			if (!this.formData.name) {
				uni.showToast({ title: '请输入商品名称', icon: 'none' });
				return;
			}
			if (!this.formData.barcode) {
				uni.showToast({ title: '请输入商品条码', icon: 'none' });
				return;
			}
			if (!this.formData.purchase_price || this.formData.purchase_price <= 0) {
				uni.showToast({ title: '请输入有效的进价', icon: 'none' });
				return;
			}
			if (!this.formData.selling_price || this.formData.selling_price <= 0) {
				uni.showToast({ title: '请输入有效的卖价', icon: 'none' });
				return;
			}

			uni.showLoading({ title: '保存中...' });

			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.hideLoading();
					uni.showToast({ title: '用户信息不完整，请重新登录', icon: 'none' });
					return;
				}

				if (this.tempImagePath && !this.formData.image_url) {
					try {
						await this.uploadImage();
					} catch (uploadErr) {
						console.error('图片上传失败:', uploadErr);
						uni.hideLoading();
						uni.showToast({ title: '图片上传失败，请重试', icon: 'none' });
						return;
					}
				}

				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'queryByBarcode',
						barcode: this.formData.barcode,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0 && res.result.data.length > 0) {
					uni.hideLoading();
					uni.showToast({ title: '条码已存在，请使用其他条码', icon: 'none' });
					return;
				}

				const profit = this.formData.selling_price - this.formData.purchase_price;
				const saveRes = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'add',
						data: {
							...this.formData,
							profit: profit,
							openid: userInfo.openid || ''
						},
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				uni.hideLoading();

				if (saveRes.result.code === 0) {
					uni.showToast({ title: '保存成功', icon: 'success' });
					this.tempImagePath = '';
					this.formData = {
						name: '',
						barcode: '',
						purchase_price: '',
						selling_price: '',
						image_url: '',
						remark: ''
					};
				} else {
					uni.showToast({ title: '保存失败，请重试', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				console.error('保存失败:', err);
				uni.showToast({ title: '保存失败，请重试', icon: 'none' });
			}
		}
	}
};
</script>

<style lang="scss">
/* ============================================================
   1. 页面基底
   ============================================================ */
.page {
	min-height: 100vh;
	background: #FAFAFA;
	padding: 0 24rpx;
	padding-bottom: 180rpx;
}

.status-bar {
	width: 100%;
}

/* ============================================================
   2. 极简标题
   ============================================================ */
.page-header {
	padding: 20rpx 8rpx 24rpx;
}

.page-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 8rpx;
}

.page-sub {
	display: block;
	font-size: 26rpx;
	color: #9CA3AF;
}

/* ============================================================
   3. 表单卡片
   ============================================================ */
.form-card {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 32rpx 28rpx;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.02);
}

.form-item {
	margin-bottom: 28rpx;
}

.form-row {
	display: flex;
	gap: 20rpx;
}

.form-item.half {
	flex: 1;
}

.form-label {
	display: block;
	font-size: 26rpx;
	color: #374151;
	margin-bottom: 12rpx;
	font-weight: 500;
}

.required {
	color: #EF4444;
}

.form-input {
	width: 100%;
	height: 88rpx;
	background: #F9FAFB;
	border-radius: 8px;
	padding: 0 22rpx;
	font-size: 28rpx;
	color: #1F2937;
	border: 1px solid #E5E7EB;
	transition: border-color 0.2s;

	&:focus {
		border-color: #4F46E5;
	}
}

.input-with-unit {
	display: flex;
	align-items: center;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding-right: 22rpx;
	border: 1px solid #F3F4F6;
}

.input-with-unit .form-input {
	background: transparent;
	flex: 1;
	border: none;
}

.unit {
	font-size: 26rpx;
	color: #6B7280;
}

/* 条码输入 */
.barcode-input-row {
	display: flex;
	gap: 14rpx;
	align-items: center;
}

.barcode-input {
	flex: 1;
}

.scan-barcode-btn {
	width: 140rpx;
	height: 88rpx;
	padding: 0;
	margin: 0;
	background: #4F46E5;
	color: #FFFFFF;
	font-size: 24rpx;
	font-weight: 500;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	border: none;
	box-shadow: 0 4rpx 16rpx rgba(79, 70, 229, 0.2);
}

/* 备注 */
.form-textarea {
	width: 100%;
	height: 150rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding: 18rpx 22rpx;
	font-size: 28rpx;
	color: #1F2937;
	border: 1px solid #F3F4F6;
}

.char-count {
	display: block;
	text-align: right;
	font-size: 22rpx;
	color: #9CA3AF;
	margin-top: 8rpx;
}

/* 图片 */
.image-picker {
	width: 180rpx;
	height: 180rpx;
	border: 3rpx dashed #D1D5DB;
	border-radius: 14rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	background: #F9FAFB;
}

.image-picker-text {
	font-size: 22rpx;
	color: #9CA3AF;
}

.image-preview {
	position: relative;
	width: 180rpx;
	height: 180rpx;
}

.preview-img {
	width: 180rpx;
	height: 180rpx;
	border-radius: 14rpx;
}

.image-delete {
	position: absolute;
	top: -14rpx;
	right: -14rpx;
	width: 40rpx;
	height: 40rpx;
	background: #EF4444;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid #FFFFFF;
}

/* 提交按钮 */
.submit-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
	box-shadow: 0 6rpx 24rpx rgba(79, 70, 229, 0.28);
	color: #FFFFFF;
	font-size: 30rpx;
	font-weight: 600;
	border-radius: 14rpx;
	padding: 0;
	margin: 0;
	margin-top: 20rpx;
	border: none;
	box-shadow: 0 6rpx 24rpx rgba(79, 70, 229, 0.25);
}
</style>
