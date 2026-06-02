<template>
	<view class="page">
		<!-- ===== 状态栏占位 ===== -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 顶部：标题 + 导出 ===== -->
		<view class="top-bar">
			<view class="top-title-row">
				<text class="page-title">商品列表</text>
				<text class="goods-count" v-if="goodsList.length > 0">{{ goodsList.length }}件</text>
			</view>
			<view class="export-btn" v-if="goodsList.length > 0" @click="exportToExcel">
				<uni-icons type="download" size="16" color="#4F46E5"></uni-icons>
				<text class="export-text">导出</text>
			</view>
		</view>

		<!-- ===== 财务仪表盘 ===== -->
		<view class="dashboard" v-if="goodsList.length > 0">
			<view class="dash-item">
				<text class="dash-label">总进价</text>
				<text class="dash-value">{{ totalPurchase }}</text>
			</view>
			<view class="dash-divider"></view>
			<view class="dash-item">
				<text class="dash-label">总售价</text>
				<text class="dash-value">{{ totalSelling }}</text>
			</view>
			<view class="dash-divider"></view>
			<view class="dash-item">
				<text class="dash-label">总利润</text>
				<text class="dash-value dash-profit">{{ totalProfit }}</text>
			</view>
		</view>

		<!-- ===== 商品列表 ===== -->
		<view class="goods-list" v-if="goodsList.length > 0">
			<view
				v-for="(goods, index) in goodsList"
				:key="goods.id"
				class="goods-card"
			>
				<view class="card-main" @click="openGoodsDetail(goods)">
					<view class="goods-row">
						<!-- 头像 -->
						<view v-if="goods.image_url" class="goods-avatar-img">
							<image :src="goods.image_url" mode="aspectFill" class="avatar-image"></image>
						</view>
						<view v-else class="goods-avatar" :style="{ background: getAvatarColor(goods.name) }">
							<text class="avatar-letter">{{ goods.name.charAt(0) }}</text>
						</view>

						<!-- 名称 + 条码 + 价格标签 -->
						<view class="goods-info">
							<view class="goods-name-row">
								<text class="goods-name">{{ goods.name }}</text>
							</view>
							<text class="goods-barcode">{{ goods.barcode }}</text>
							<view class="price-tags">
								<view class="price-tag tag-purchase">
									<text class="tag-label">进</text>
									<text class="tag-value">¥{{ formatPrice(goods.purchase_price) }}</text>
								</view>
								<view class="price-tag tag-selling">
									<text class="tag-label">售</text>
									<text class="tag-value">¥{{ formatPrice(goods.selling_price) }}</text>
								</view>
								<view class="price-tag tag-profit">
									<text class="tag-label">利</text>
									<text class="tag-value">¥{{ calculateProfit(goods) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 右侧操作按钮 -->
				<view class="card-actions" v-if="hasDeletePermission">
					<view class="action-btn btn-edit" @click.stop="openEditForm(goods)">
						<uni-icons type="compose" size="18" color="#9CA3AF"></uni-icons>
					</view>
					<view class="action-btn btn-delete" @click.stop="showDeleteConfirm(goods)">
						<uni-icons type="trash" size="18" color="#FCA5A5"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- ===== 空状态 ===== -->
		<view class="empty-state" v-else>
			<view class="empty-icon">
				<uni-icons type="shop" size="48" color="#FFFFFF"></uni-icons>
			</view>
			<text class="empty-title">暂无商品</text>
			<text class="empty-desc">点击首页"新增商品"开始添加</text>
			<button class="empty-btn" @click="goToHome">去添加商品</button>
		</view>

		<!-- ==================== 编辑弹窗 ==================== -->
		<view class="popup" v-if="showEditPopup">
			<view class="popup-mask" @click="closeEditForm"></view>
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">编辑商品</text>
					<view class="popup-close" @click="closeEditForm">
						<uni-icons type="closeempty" size="18" color="#999"></uni-icons>
					</view>
				</view>

				<view class="form">
					<view class="form-item">
						<text class="form-label">商品名称 <text class="required">*</text></text>
						<input type="text" v-model="editFormData.name" placeholder="请输入商品名称" class="form-input" cursor-spacing="20" />
					</view>

					<view class="form-row">
						<view class="form-item half">
							<text class="form-label">进价 <text class="required">*</text></text>
							<view class="input-with-unit">
								<input type="digit" v-model.number="editFormData.purchase_price" placeholder="0.00" class="form-input" cursor-spacing="20" />
								<text class="unit">元</text>
							</view>
						</view>
						<view class="form-item half">
							<text class="form-label">卖价 <text class="required">*</text></text>
							<view class="input-with-unit">
								<input type="digit" v-model.number="editFormData.selling_price" placeholder="0.00" class="form-input" cursor-spacing="20" />
								<text class="unit">元</text>
							</view>
						</view>
					</view>

					<view class="form-item">
						<text class="form-label">商品条码 <text class="required">*</text></text>
						<view class="barcode-input-row">
							<input type="text" v-model="editFormData.barcode" placeholder="请输入或扫描商品条码" class="form-input barcode-input" cursor-spacing="20" />
							<button class="scan-barcode-btn" @click="scanBarcodeForEdit">
								<uni-icons type="scan" size="16" color="#FFFFFF"></uni-icons>
								<text>扫码</text>
							</button>
						</view>
					</view>

					<view class="form-item">
						<text class="form-label">商品图片</text>
						<view class="image-picker-area">
							<view v-if="editFormData.image_url" class="image-preview">
								<image :src="editFormData.image_url" mode="aspectFill" class="preview-img" @click="chooseEditImage"></image>
								<view class="image-delete-btn" @click="removeEditImage">
									<uni-icons type="closeempty" size="12" color="#FFF"></uni-icons>
								</view>
							</view>
							<view v-else class="image-add-box" @click="chooseEditImage">
								<uni-icons type="camera" size="28" color="#bbb"></uni-icons>
								<text class="image-add-text">添加图片</text>
							</view>
						</view>
					</view>

					<view class="form-item">
						<text class="form-label">备注</text>
						<textarea v-model="editFormData.remark" placeholder="可选填" class="form-textarea" :maxlength="100" cursor-spacing="20" />
						<text class="char-count">{{ (editFormData.remark && editFormData.remark.length) || 0 }}/100</text>
					</view>
				</view>

				<view class="popup-footer">
					<button class="btn-cancel" @click="closeEditForm">取消</button>
					<button class="btn-submit" @click="submitEditForm">保存修改</button>
				</view>
			</view>
		</view>

		<!-- ==================== 详情弹窗 ==================== -->
		<view class="popup" v-if="showDetailPopup">
			<view class="popup-mask" @click="closeDetailPopup"></view>
			<view class="popup-content detail-popup-content">
				<view class="popup-header">
					<text class="popup-title">商品详情</text>
					<view class="popup-close" @click="closeDetailPopup">
						<uni-icons type="closeempty" size="18" color="#999"></uni-icons>
					</view>
				</view>

				<view class="detail-image-area">
					<image v-if="detailGoods.image_url" :src="detailGoods.image_url" mode="aspectFit" class="detail-main-image"></image>
					<view v-else class="detail-avatar-large" :style="{ background: getAvatarColor(detailGoods.name || '') }">
						<text class="detail-avatar-letter">{{ (detailGoods.name || '').charAt(0) }}</text>
					</view>
				</view>

				<text class="detail-goods-name">{{ detailGoods.name }}</text>

				<view class="detail-price-row">
					<view class="detail-price-item">
						<text class="detail-price-label">进价</text>
						<text class="detail-price-value">¥{{ formatPrice(detailGoods.purchase_price) }}</text>
					</view>
					<view class="detail-price-item">
						<text class="detail-price-label">售价</text>
						<text class="detail-price-value detail-selling">¥{{ formatPrice(detailGoods.selling_price) }}</text>
					</view>
					<view class="detail-price-item">
						<text class="detail-price-label">利润</text>
						<text class="detail-price-value detail-profit">¥{{ calculateProfit(detailGoods) }}</text>
					</view>
				</view>

				<view class="detail-info-row" v-if="detailGoods.image_url">
					<text class="detail-info-label">商品图片</text>
					<text class="detail-info-value has-image">已上传</text>
				</view>

				<view class="detail-info-row">
					<text class="detail-info-label">条码</text>
					<text class="detail-info-value barcode-font">{{ detailGoods.barcode }}</text>
				</view>

				<view class="detail-info-row" v-if="detailGoods.remark">
					<text class="detail-info-label">备注</text>
					<text class="detail-info-value">{{ detailGoods.remark }}</text>
				</view>

				<view class="detail-close-area">
					<button class="detail-close-btn" @click="closeDetailPopup">关闭</button>
				</view>
			</view>
		</view>

		<!-- ===== 底部导航 ===== -->
		<tab-bar :currentIndex="1"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			statusBarHeight: 0,
			goodsList: [],
			userInfo: null,
			showEditPopup: false,
			editFormData: {
				id: '',
				name: '',
				purchase_price: '',
				selling_price: '',
				barcode: '',
				image_url: '',
				remark: ''
			},
			showDetailPopup: false,
			detailGoods: {}
		};
	},
	computed: {
		hasDeletePermission() {
			return (this.userInfo && (this.userInfo.role === 'store_manager' || this.userInfo.role === 'manager'));
		},
		totalPurchase() {
			const total = this.goodsList.reduce((sum, g) => sum + parseFloat(g.purchase_price || 0), 0);
			return '¥' + total.toFixed(2);
		},
		totalSelling() {
			const total = this.goodsList.reduce((sum, g) => sum + parseFloat(g.selling_price || 0), 0);
			return '¥' + total.toFixed(2);
		},
		totalProfit() {
			const total = this.goodsList.reduce((sum, g) => {
				return sum + (parseFloat(g.selling_price || 0) - parseFloat(g.purchase_price || 0));
			}, 0);
			return '¥' + total.toFixed(2);
		}
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.userInfo = uni.getStorageSync('userInfo');
		this.loadGoodsList();
	},
	onShow() {
		uni.hideTabBar({ animation: false });
		this.userInfo = uni.getStorageSync('userInfo');
		this.loadGoodsList();
	},
	methods: {
		getAvatarColor(name) {
			const colors = [
				'linear-gradient(135deg, #667eea, #764ba2)',
				'linear-gradient(135deg, #f093fb, #f5576c)',
				'linear-gradient(135deg, #4facfe, #00f2fe)',
				'linear-gradient(135deg, #43e97b, #38f9d7)',
				'linear-gradient(135deg, #fa709a, #fee140)',
				'linear-gradient(135deg, #a18cd1, #fbc2eb)',
				'linear-gradient(135deg, #fccb90, #d57eeb)',
				'linear-gradient(135deg, #e0c3fc, #8ec5fc)'
			];
			let hash = 0;
			for (let i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash);
			}
			return colors[Math.abs(hash) % colors.length];
		},
		calculateProfit(goods) {
			return (parseFloat(goods.selling_price || 0) - parseFloat(goods.purchase_price || 0)).toFixed(2);
		},
		formatPrice(price) {
			return parseFloat(price || 0).toFixed(2);
		},
		async loadGoodsList() {
			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.showToast({ title: '用户信息不完整', icon: 'none' });
					return;
				}
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'getAll',
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				if (res.result.code === 0) {
					this.goodsList = res.result.data || [];
				}
			} catch (err) {
				console.error('加载商品失败:', err);
				uni.showToast({ title: '加载失败', icon: 'none' });
			}
		},
		showDeleteConfirm(goods) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除 "' + goods.name + '" 吗？',
				confirmColor: '#ff6b6b',
				success: (res) => {
					if (res.confirm) {
						this.deleteGoods(goods.id);
					}
				}
			});
		},
		async deleteGoods(goodsId) {
			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'delete',
						id: goodsId,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				if (res.result.code === 0) {
					uni.showToast({ title: '删除成功', icon: 'success' });
					this.loadGoodsList();
				}
			} catch (err) {
				console.error('删除商品失败:', err);
				uni.showToast({ title: '删除失败', icon: 'none' });
			}
		},
		openGoodsDetail(goods) {
			this.detailGoods = { ...goods };
			this.showDetailPopup = true;
		},
		closeDetailPopup() {
			this.showDetailPopup = false;
			this.detailGoods = {};
		},
		goToHome() {
			uni.switchTab({ url: '/pages/index/index' });
		},

		exportToExcel() {
			if (this.goodsList.length === 0) {
				uni.showToast({ title: '暂无商品可导出', icon: 'none' });
				return;
			}

			// #ifdef H5
			const headers = ['序号', '商品名称', '条码', '进价', '售价', '利润', '有图片', '备注', '创建时间'];
			const rows = this.goodsList.map((item, index) => [
				index + 1,
				item.name || '',
				String.fromCharCode(9) + (item.barcode || ''),
				parseFloat(item.purchase_price || 0).toFixed(2),
				parseFloat(item.selling_price || 0).toFixed(2),
				(parseFloat(item.selling_price || 0) - parseFloat(item.purchase_price || 0)).toFixed(2),
				item.image_url ? '是' : '否',
				item.remark || '',
				item.createdAt || ''
			]);
			const csvContent = [String.fromCharCode(0xFEFF) + [headers, ...rows].map(row =>
				row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
			).join(String.fromCharCode(10))];
			const blob = new Blob(csvContent, { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = '商品数据.csv';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(link.href);
			uni.showToast({ title: '导出成功', icon: 'success' });
			// #endif

			// #ifdef MP-WEIXIN
			uni.showLoading({ title: '导出中...' });
			try {
				const XLSX = require('xlsx');
				const data = this.goodsList.map((item, index) => ({
					'序号': index + 1,
					'商品名称': item.name || '',
					'条码': item.barcode || '',
					'进价': parseFloat(item.purchase_price || 0),
					'售价': parseFloat(item.selling_price || 0),
					'利润': parseFloat(item.selling_price || 0) - parseFloat(item.purchase_price || 0),
					'有图片': item.image_url ? '是' : '否',
					'备注': item.remark || '',
					'创建时间': item.createdAt || ''
				}));
				const worksheet = XLSX.utils.json_to_sheet(data);
				worksheet['!cols'] = [
					{ wch: 6 }, { wch: 20 }, { wch: 16 },
					{ wch: 10 }, { wch: 10 }, { wch: 10 },
					{ wch: 8 }, { wch: 20 }, { wch: 20 }
				];
				for (let i = 1; i <= this.goodsList.length; i++) {
					['D', 'E', 'F'].forEach(col => {
						const cell = worksheet[col + (i + 1)];
						if (cell) cell.z = '0.00';
					});
				}
				const workbook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(workbook, worksheet, '商品列表');
				const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
				const filePath = wx.env.USER_DATA_PATH + '/商品数据.xlsx';
				const fs = wx.getFileSystemManager();
				fs.writeFile({
					filePath,
					data: wbout.buffer,
					encoding: 'binary',
					success: () => {
						uni.hideLoading();
						wx.openDocument({
							filePath,
							fileType: 'xlsx',
							showMenu: true,
							success: () => uni.showToast({ title: '导出成功', icon: 'success' }),
							fail: (err) => {
								console.error('[export] open fail:', err);
								uni.showToast({ title: '打开文件失败', icon: 'none' });
							}
						});
					},
					fail: (err) => {
						console.error('[export] write fail:', err);
						uni.hideLoading();
						uni.showToast({ title: '导出失败', icon: 'none' });
					}
				});
			} catch (err) {
				console.error('[export] exception:', err);
				uni.hideLoading();
				uni.showToast({ title: '导出失败', icon: 'none' });
			}
			// #endif

			// #ifdef APP-PLUS
			uni.showLoading({ title: '导出中...' });
			try {
				var BOM = String.fromCharCode(0xFEFF);
				var headers2 = ['序号', '商品名称', '条码', '进价', '售价', '利润', '有图片', '备注', '创建时间'];
				var csvRows = [headers2];
				for (var r = 0; r < this.goodsList.length; r++) {
					var item = this.goodsList[r];
					csvRows.push([
						String(r + 1),
						item.name || '',
						String.fromCharCode(9) + (item.barcode || ''),
						parseFloat(item.purchase_price || 0).toFixed(2),
						parseFloat(item.selling_price || 0).toFixed(2),
						(parseFloat(item.selling_price || 0) - parseFloat(item.purchase_price || 0)).toFixed(2),
						item.image_url ? '是' : '否',
						item.remark || '',
						item.createdAt || ''
					]);
				}
				var csvLines = [];
				for (var r2 = 0; r2 < csvRows.length; r2++) {
					var row = csvRows[r2];
					var cells = [];
					for (var c = 0; c < row.length; c++) {
						cells.push('"' + String(row[c]).replace(/"/g, '""') + '"');
					}
					csvLines.push(cells.join(','));
				}
				var csvContent = BOM + csvLines.join(String.fromCharCode(10));
				var fileName = '商品数据.csv';
				var main = plus.android.runtimeMainActivity();
				var dir = plus.android.invoke(main, 'getFilesDir');
				var file = plus.android.newObject('java.io.File', dir, fileName);
				var fos = plus.android.newObject('java.io.FileOutputStream', file);
				var osw = plus.android.newObject('java.io.OutputStreamWriter', fos, 'UTF-8');
				plus.android.invoke(osw, 'write', csvContent);
				plus.android.invoke(osw, 'close');
				var filePath = plus.android.invoke(file, 'getAbsolutePath');
				uni.hideLoading();
				plus.runtime.openFile(filePath, {}, function() {
					uni.showToast({ title: '导出成功', icon: 'success' });
				}, function() {
					uni.showToast({ title: '已保存到应用目录', icon: 'success' });
				});
			} catch (err) {
				console.error('[export] exception:', err);
				uni.hideLoading();
				uni.showToast({ title: '导出失败', icon: 'none' });
			}
			// #endif
		},

		openEditForm(goods) {
			this.editFormData = {
				id: goods.id,
				name: goods.name,
				purchase_price: parseFloat(goods.purchase_price) || 0,
				selling_price: parseFloat(goods.selling_price) || 0,
				barcode: goods.barcode,
				image_url: goods.image_url || '',
				remark: goods.remark || ''
			};
			this.showEditPopup = true;
		},

		closeEditForm() {
			this.showEditPopup = false;
		},

		chooseEditImage() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					const tempPath = res.tempFilePaths[0];
					uni.compressImage({
						src: tempPath,
						quality: 60,
						width: '50%',
						height: '50%',
						success: async (compRes) => {
							try {
								uni.showLoading({ title: '处理中...' });
								const base64 = await this.imageToBase64(compRes.tempFilePath);
								this.editFormData.image_url = base64;
							} catch (err) {
								console.error('图片处理失败:', err);
								uni.showToast({ title: '图片处理失败', icon: 'none' });
							} finally {
								uni.hideLoading();
							}
						},
						fail: async () => {
							try {
								uni.showLoading({ title: '处理中...' });
								const base64 = await this.imageToBase64(tempPath);
								this.editFormData.image_url = base64;
							} catch (err) {
								console.error('图片处理失败:', err);
								uni.showToast({ title: '图片处理失败', icon: 'none' });
							} finally {
								uni.hideLoading();
							}
						}
					});
				}
			});
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

		removeEditImage() {
			this.editFormData.image_url = '';
		},

		scanBarcodeForEdit() {
			// #ifdef H5
			uni.showModal({
				title: '输入条码',
				content: 'H5 环境不支持扫码，请手动输入商品条码',
				editable: true,
				placeholderText: '请输入商品条码',
				success: (res) => {
					if (res.confirm && res.content) {
						this.editFormData.barcode = res.content.trim();
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
								this.editFormData.barcode = finalCode;
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

		async submitEditForm() {
			if (!this.editFormData.name) {
				uni.showToast({ title: '请输入商品名称', icon: 'none' });
				return;
			}
			if (!this.editFormData.purchase_price || this.editFormData.purchase_price <= 0) {
				uni.showToast({ title: '请输入有效的进价', icon: 'none' });
				return;
			}
			if (!this.editFormData.selling_price || this.editFormData.selling_price <= 0) {
				uni.showToast({ title: '请输入有效的卖价', icon: 'none' });
				return;
			}
			if (!this.editFormData.barcode) {
				uni.showToast({ title: '请输入商品条码', icon: 'none' });
				return;
			}

			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.showToast({ title: '用户信息不完整', icon: 'none' });
					return;
				}
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'update',
						data: {
							id: this.editFormData.id,
							name: this.editFormData.name,
							purchase_price: this.editFormData.purchase_price,
							selling_price: this.editFormData.selling_price,
							barcode: this.editFormData.barcode,
							image_url: this.editFormData.image_url,
							remark: this.editFormData.remark
						},
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				if (res.result.code === 0) {
					uni.showToast({ title: '修改成功', icon: 'success' });
					this.closeEditForm();
					this.loadGoodsList();
				} else {
					uni.showToast({ title: res.result.message || '修改失败', icon: 'none' });
				}
			} catch (err) {
				console.error('修改商品失败:', err);
				uni.showToast({ title: '修改失败', icon: 'none' });
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
   2. 顶栏：标题 + 导出
   ============================================================ */
.top-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 8rpx 16rpx;
}

.top-title-row {
	display: flex;
	align-items: baseline;
	gap: 16rpx;
}

.page-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #1F2937;
}

.goods-count {
	font-size: 24rpx;
	color: #9CA3AF;
	background: #F3F4F6;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
}

.export-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(79, 70, 229, 0.06);
	border-radius: 32rpx;
	padding: 14rpx 28rpx;
}

.export-text {
	font-size: 24rpx;
	color: #4F46E5;
	font-weight: 500;
}

/* ============================================================
   3. 财务仪表盘 — 纯白卡片
   ============================================================ */
.dashboard {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 32rpx 16rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
	margin-bottom: 24rpx;
}

.dash-item {
	flex: 1;
	text-align: center;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.dash-label {
	font-size: 24rpx;
	color: #9CA3AF;
}

.dash-value {
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
	font-family: "SF Mono", "Menlo", "Consolas", monospace;
}

.dash-profit {
	color: #10B981;
}

.dash-divider {
	width: 2rpx;
	height: 48rpx;
	background: #F3F4F6;
}

/* ============================================================
   4. 商品列表卡片
   ============================================================ */
.goods-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.goods-card {
	display: flex;
	background: #FFFFFF;
	border-radius: 16px;
	padding: 28rpx 24rpx;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.card-main {
	flex: 1;
	min-width: 0;
}

.goods-row {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
}

/* 头像 */
.goods-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.goods-avatar-img {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	overflow: hidden;
	flex-shrink: 0;
}

.avatar-image {
	width: 80rpx;
	height: 80rpx;
}

.avatar-letter {
	font-size: 34rpx;
	font-weight: 700;
	color: #FFFFFF;
}

/* 商品信息 */
.goods-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.goods-name-row {
	display: flex;
	align-items: center;
}

.goods-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #1F2937;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.goods-barcode {
	font-size: 22rpx;
	color: #9CA3AF;
	font-family: monospace;
}

/* ============================================================
   5. 价格标签 — 极淡底色
   ============================================================ */
.price-tags {
	display: flex;
	gap: 12rpx;
	margin-top: 4rpx;
}

.price-tag {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 6rpx 16rpx;
	border-radius: 8rpx;
}

.tag-label {
	font-size: 20rpx;
	font-weight: 600;
}

.tag-value {
	font-size: 24rpx;
	font-weight: 600;
	font-family: "SF Mono", "Menlo", "Consolas", monospace;
}

/* 进价 — 淡灰底深灰字 */
.tag-purchase {
	background: #F3F4F6;
	.tag-label { color: #6B7280; }
	.tag-value { color: #4B5563; }
}

/* 售价 — 淡蓝底深蓝字 */
.tag-selling {
	background: rgba(79, 70, 229, 0.06);
	.tag-label { color: #6366F1; }
	.tag-value { color: #4F46E5; }
}

/* 利润 — 淡绿底深绿字 */
.tag-profit {
	background: rgba(16, 185, 129, 0.08);
	.tag-label { color: #10B981; }
	.tag-value { color: #059669; }
}

/* ============================================================
   6. 操作按钮 — 极简图标
   ============================================================ */
.card-actions {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 20rpx;
	margin-left: 16rpx;
	flex-shrink: 0;
}

.action-btn {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-edit {
	background: transparent;
}

.btn-delete {
	background: transparent;
}

/* ============================================================
   7. 空状态
   ============================================================ */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
}

.empty-icon {
	width: 180rpx;
	height: 180rpx;
	background: linear-gradient(135deg, #4F46E5, #818CF8);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 36rpx;
	box-shadow: 0 12rpx 36rpx rgba(79, 70, 229, 0.2);
}

.empty-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 12rpx;
}

.empty-desc {
	font-size: 26rpx;
	color: #9CA3AF;
	margin-bottom: 36rpx;
}

.empty-btn {
	width: 320rpx;
	height: 88rpx;
	line-height: 88rpx;
	background: #4F46E5;
	color: #FFFFFF;
	font-size: 30rpx;
	font-weight: 600;
	border-radius: 44rpx;
	border: none;
	box-shadow: 0 8rpx 24rpx rgba(79, 70, 229, 0.25);
}

/* ============================================================
   8. 弹窗
   ============================================================ */
.popup {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: flex-end;
}

.popup-mask {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
}

.popup-content {
	width: 100%;
	background: #FFFFFF;
	border-radius: 32rpx 32rpx 0 0;
	padding: 40rpx;
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
	position: relative;
	z-index: 10000;
	max-height: 85vh;
	overflow-y: auto;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 36rpx;
}

.popup-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #1F2937;
}

.popup-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #F3F4F6;
	border-radius: 50%;
}

/* 表单 */
.form {
	margin-bottom: 36rpx;
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
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #1F2937;
	border: 2rpx solid transparent;
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
	padding-right: 24rpx;
}

.input-with-unit .form-input {
	background: transparent;
	flex: 1;
}

.unit {
	font-size: 26rpx;
	color: #6B7280;
}

.barcode-input-row {
	display: flex;
	gap: 16rpx;
	align-items: center;
}

.barcode-input {
	flex: 1;
}

.scan-barcode-btn {
	width: 150rpx;
	height: 88rpx;
	padding: 0;
	margin: 0;
	background: #4F46E5;
	color: #FFFFFF;
	font-size: 24rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	border: none;
}

.form-textarea {
	width: 100%;
	height: 150rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	color: #1F2937;
	border: 2rpx solid transparent;
}

.char-count {
	display: block;
	text-align: right;
	font-size: 22rpx;
	color: #9CA3AF;
	margin-top: 8rpx;
}

/* 弹窗底部按钮 */
.popup-footer {
	display: flex;
	gap: 20rpx;
	padding-top: 20rpx;
}

.btn-cancel,
.btn-submit {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	font-weight: 600;
	border-radius: 16rpx;
	padding: 0;
	margin: 0;
	border: none;
}

.btn-cancel {
	background: #F3F4F6;
	color: #6B7280;
}

.btn-submit {
	background: #4F46E5;
	color: #FFFFFF;
	box-shadow: 0 6rpx 20rpx rgba(79, 70, 229, 0.25);
}

/* 图片选择 */
.image-picker-area {
	display: flex;
	align-items: flex-start;
}

.image-add-box {
	width: 170rpx;
	height: 170rpx;
	border: 3rpx dashed #D1D5DB;
	border-radius: 16rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	background: #F9FAFB;
}

.image-add-text {
	font-size: 22rpx;
	color: #9CA3AF;
}

.image-preview {
	position: relative;
	width: 170rpx;
	height: 170rpx;
}

.preview-img {
	width: 170rpx;
	height: 170rpx;
	border-radius: 16rpx;
}

.image-delete-btn {
	position: absolute;
	top: -12rpx;
	right: -12rpx;
	width: 40rpx;
	height: 40rpx;
	background: #EF4444;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid #FFFFFF;
}

/* ============================================================
   9. 详情弹窗
   ============================================================ */
.detail-popup-content {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.detail-image-area {
	display: flex;
	justify-content: center;
	margin-bottom: 28rpx;
}

.detail-main-image {
	width: 360rpx;
	height: 360rpx;
	border-radius: 20rpx;
	background: #F9FAFB;
}

.detail-avatar-large {
	width: 150rpx;
	height: 150rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.detail-avatar-letter {
	font-size: 64rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.detail-goods-name {
	font-size: 38rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 28rpx;
	text-align: center;
}

.detail-price-row {
	display: flex;
	width: 100%;
	background: #F9FAFB;
	border-radius: 16rpx;
	padding: 28rpx 0;
	margin-bottom: 28rpx;
}

.detail-price-item {
	flex: 1;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.detail-price-item:not(:last-child) {
	border-right: 2rpx solid #E5E7EB;
}

.detail-price-label {
	font-size: 22rpx;
	color: #9CA3AF;
}

.detail-price-value {
	font-size: 30rpx;
	font-weight: 700;
	color: #1F2937;
}

.detail-selling {
	color: #4F46E5;
}

.detail-profit {
	color: #10B981;
}

.detail-info-row {
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 22rpx 0;
	border-bottom: 1px solid #F3F4F6;
}

.detail-info-label {
	font-size: 26rpx;
	color: #9CA3AF;
}

.detail-info-value {
	font-size: 26rpx;
	color: #1F2937;
	flex: 1;
	text-align: right;
}

.detail-info-value.has-image {
	color: #4F46E5;
	font-weight: 500;
}

.barcode-font {
	font-family: monospace;
}

.detail-close-area {
	width: 100%;
	margin-top: 36rpx;
}

.detail-close-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	font-weight: 500;
	border-radius: 16rpx;
	background: #F3F4F6;
	color: #6B7280;
	padding: 0;
	margin: 0;
	border: none;
}
</style>
