// Memastikan DOM telah dimuat sepenuhnya sebelum menjalankan script
document.addEventListener('DOMContentLoaded', function() {

	// ===== DARK MODE MANAGEMENT =====
	const themeToggle = document.getElementById('themeToggle');
	const htmlElement = document.documentElement;

	// Cek tema yang tersimpan di localStorage atau default ke light mode
	const currentTheme = localStorage.getItem('theme') || 'light';

	// Terapkan tema yang tersimpan
	if (currentTheme === 'dark') {
		htmlElement.classList.add('dark');
		themeToggle.classList.add('active');
	}

	// Event listener untuk toggle tema
	themeToggle.addEventListener('click', function() {
		if (htmlElement.classList.contains('dark')) {
			htmlElement.classList.remove('dark');
			themeToggle.classList.remove('active');
			localStorage.setItem('theme', 'light');
		} else {
			htmlElement.classList.add('dark');
			themeToggle.classList.add('active');
			localStorage.setItem('theme', 'dark');
		}
	});

	// ===== DATA & VARIABEL GLOBAL =====
	// Inisialisasi daftar transaksi, akan diisi dari localStorage
	let transactions = [];

	// Daftar kode promo yang tersedia
	const promoCodes = {
		"DISKON10": {
			type: "percentage",
			discount: 10,
			description: "Potongan 10%"
		},
		"HEMAT50K": {
			type: "fixed",
			discount: 50000,
			description: "Diskon tetap Rp 50.000"
		},
		"STUDENT20": {
			type: "percentage",
			discount: 20,
			description: "Diskon 20% khusus pelajar"
		}
	};

	// Mapping warna Tailwind CSS untuk metode pembayaran
	const paymentMethodColors = {
		'transfer': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
		'ewallet': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
		'credit': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
		'cash': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
	};

	// Mapping nama tampilan untuk metode pembayaran
	const paymentMethodNames = {
		'transfer': 'Transfer Bank',
		'ewallet': 'E-Wallet',
		'credit': 'Kartu Kredit',
		'cash': 'Bayar Tunai'
	};

	// Objek untuk menyimpan state aplikasi saat ini
	let appState = {
		currentDiscount: 0,
		appliedPromoCode: ''
	};

	// ===== MENDAPATKAN ELEMEN DOM =====
	const paymentForm = document.getElementById('paymentForm');
	const productSelect = document.getElementById('productSelect');
	const quantity = document.getElementById('quantity');
	const promoCodeInput = document.getElementById('promoCode');
	const applyPromoBtn = document.getElementById('applyPromoBtn');

	const subtotalEl = document.getElementById('subtotal');
	const discountEl = document.getElementById('discount');
	const discountRow = document.getElementById('discountRow');
	const totalAmountEl = document.getElementById('totalAmount');

	const transactionList = document.getElementById('transactionList');
	const clearHistoryBtn = document.getElementById('clearHistoryBtn');

	const totalTransactionsEl = document.getElementById('totalTransactions');
	const totalRevenueEl = document.getElementById('totalRevenue');
	const avgTransactionEl = document.getElementById('avgTransaction');

	const paymentModal = document.getElementById('paymentModal');
	const paymentDetails = document.getElementById('paymentDetails');
	const closeModalBtn = document.getElementById('closeModalBtn');

	const confirmModal = document.getElementById('confirmModal');
	const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
	const confirmClearBtn = document.getElementById('confirmClearBtn');

	const submitButton = document.getElementById('submitButton');
	const buttonText = document.getElementById('buttonText');
	const buttonSpinner = document.getElementById('buttonSpinner');

	const toastContainer = document.getElementById('toastContainer');

	// ===== FUNGSI UTILITY & UI =====

	/**
	 * Memformat angka menjadi format mata uang Rupiah.
	 * @param {number} amount - Jumlah yang akan diformat.
	 * @returns {string} - String mata uang yang diformat.
	 */
	const formatCurrency = amount => new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0
	}).format(amount);

	/**
	 * Mendapatkan waktu saat ini dalam format HH:MM.
	 * @returns {string} - Waktu saat ini.
	 */
	const getCurrentTime = () => new Date().toLocaleTimeString('id-ID', {
		hour: '2-digit',
		minute: '2-digit'
	});

	/**
	 * Menghasilkan ID transaksi unik.
	 * @returns {string} - ID transaksi.
	 */
	const generateTransactionId = () => 'TRX-' + Date.now().toString().slice(-6);

	/**
	 * Validasi format email.
	 * @param {string} email - Email yang akan divalidasi.
	 * @returns {boolean} - True jika email valid.
	 */
	function isValidEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Menampilkan notifikasi toast dengan tema yang sesuai.
	 * @param {string} message - Pesan yang akan ditampilkan.
	 * @param {'success'|'error'} type - Tipe notifikasi (sukses atau error).
	 */
	function showToast(message, type = 'success') {
		const bgColor = type === 'success' ?
			'bg-gradient-to-r from-green-500 to-emerald-600' :
			'bg-gradient-to-r from-red-500 to-red-600';
		const toast = document.createElement('div');
		toast.className = `w-auto px-6 py-3 rounded-xl shadow-lg text-white ${bgColor} animate-slide-in-down backdrop-blur-md border border-white/20`;
		toast.textContent = message;
		toastContainer.appendChild(toast);

		setTimeout(() => {
			toast.classList.remove('animate-slide-in-down');
			toast.classList.add('animate-fade-out');
			toast.addEventListener('animationend', () => toast.remove());
		}, 3000);
	}

	/**
	 * Menampilkan atau menyembunyikan modal.
	 * @param {HTMLElement} modalElement - Elemen modal yang akan diatur.
	 * @param {boolean} show - True untuk menampilkan, false untuk menyembunyikan.
	 */
	function toggleModal(modalElement, show) {
		if (show) {
			modalElement.classList.add('modal-active');
		} else {
			modalElement.classList.remove('modal-active');
		}
	}

	// ===== FUNGSI PENYIMPANAN DATA (LOCALSTORAGE) =====

	/**
	 * Memuat data transaksi dari localStorage.
	 */
	function loadTransactions() {
		try {
			const storedTransactions = localStorage.getItem('modernPaymentTransactions');
			if (storedTransactions) {
				transactions = JSON.parse(storedTransactions);
			}
		} catch (error) {
			console.error("Gagal memuat transaksi dari localStorage:", error);
			transactions = [];
			showToast('Gagal memuat data transaksi. Data telah direset.', 'error');
		}
	}

	/**
	 * Menyimpan data transaksi ke localStorage.
	 */
	function saveTransactions() {
		try {
			localStorage.setItem('modernPaymentTransactions', JSON.stringify(transactions));
		} catch (error) {
			console.error("Gagal menyimpan transaksi ke localStorage:", error);
			showToast('Gagal menyimpan data transaksi.', 'error');
		}
	}

	// ===== FUNGSI KALKULASI =====

	/**
	 * Menghitung subtotal berdasarkan produk dan kuantitas yang dipilih.
	 * @returns {number} - Nilai subtotal.
	 */
	function calculateSubtotal() {
		const selectedOption = productSelect.options[productSelect.selectedIndex];
		if (!selectedOption || !selectedOption.dataset.price) return 0;

		const price = parseInt(selectedOption.dataset.price, 10);
		const qty = parseInt(quantity.value, 10) || 1;
		return price * qty;
	}

	/**
	 * Menghitung diskon berdasarkan subtotal dan data promo.
	 * @param {number} subtotal - Nilai subtotal.
	 * @param {object | null} promoData - Objek data promo atau null jika tidak ada.
	 * @returns {number} - Nilai diskon yang dihitung.
	 */
	function calculateDiscount(subtotal, promoData) {
		if (!promoData) return 0;

		if (promoData.type === 'percentage') {
			return Math.round(subtotal * promoData.discount / 100);
		} else if (promoData.type === 'fixed') {
			return Math.min(promoData.discount, subtotal);
		}
		return 0;
	}

	/**
	 * Memperbarui tampilan subtotal, diskon, dan total pembayaran.
	 */
	function updateTotal() {
		const subtotal = calculateSubtotal();
		const promoData = appState.appliedPromoCode ? promoCodes[appState.appliedPromoCode] : null;
		const discount = calculateDiscount(subtotal, promoData);
		const total = subtotal - discount;

		subtotalEl.textContent = formatCurrency(subtotal);
		if (discount > 0) {
			discountEl.textContent = '-' + formatCurrency(discount);
			discountRow.classList.remove('hidden');
		} else {
			discountRow.classList.add('hidden');
		}
		totalAmountEl.textContent = formatCurrency(total);
		appState.currentDiscount = discount;
	}

	// ===== FUNGSI PROMO & TRANSAKSI =====

	/**
	 * Menerapkan kode promo yang dimasukkan pengguna.
	 */
	function applyPromoCode() {
		const code = promoCodeInput.value.trim().toUpperCase();

		if (!code) {
			showToast('Masukkan kode promo!', 'error');
			return;
		}

		if (!promoCodes[code]) {
			showToast('Kode promo tidak valid!', 'error');
			appState.appliedPromoCode = '';
			updateTotal();
			return;
		}

		appState.appliedPromoCode = code;
		updateTotal();
		showToast(`Promo "${code}" berhasil diterapkan: ${promoCodes[code].description}`);
	}

	/**
	 * Mengatur ulang formulir pembayaran dan state aplikasi.
	 */
	function resetFormState() {
		paymentForm.reset();
		appState = {
			currentDiscount: 0,
			appliedPromoCode: ''
		};
		updateTotal();
	}

	// ===== RENDER & DOM MANIPULATION =====

	/**
	 * Merender daftar transaksi ke tabel.
	 */
	function renderTransactions() {
		transactionList.innerHTML = '';
		if (transactions.length === 0) {
			const emptyTemplate = document.getElementById('emptyStateTemplate');
			transactionList.appendChild(emptyTemplate.content.cloneNode(true));
			clearHistoryBtn.classList.add('hidden');
		} else {
			clearHistoryBtn.classList.remove('hidden');
			transactions.slice().reverse().forEach(transaction => {
				const template = document.getElementById('transactionTemplate');
				const clone = template.content.cloneNode(true);
				const row = clone.querySelector('tr');

				row.querySelector('.transaction-id').textContent = transaction.id;
				row.querySelector('.transaction-customer').textContent = transaction.customerName;
				row.querySelector('.transaction-product').textContent = `${transaction.product.split(' - ')[0]} (${transaction.quantity}x)`;
				row.querySelector('.transaction-amount').textContent = formatCurrency(transaction.total);

				const methodEl = row.querySelector('.transaction-method');
				methodEl.textContent = paymentMethodNames[transaction.paymentMethod];
				methodEl.className = `transaction-method px-2 py-1 rounded-full text-xs ${paymentMethodColors[transaction.paymentMethod]}`;

				row.querySelector('.transaction-time').textContent = transaction.time;

				row.classList.add('animate-slide-in-down');
				transactionList.appendChild(clone);
			});
		}
		updateStatistics();
	}

	/**
	 * Memperbarui statistik total transaksi, pendapatan, dan rata-rata.
	 */
	function updateStatistics() {
		const totalTrans = transactions.length;
		const totalRev = transactions.reduce((sum, t) => sum + t.total, 0);
		const avgTrans = totalTrans > 0 ? totalRev / totalTrans : 0;

		totalTransactionsEl.textContent = totalTrans;
		totalRevenueEl.textContent = formatCurrency(totalRev);
		avgTransactionEl.textContent = formatCurrency(avgTrans);
	}

	// ===== MODAL LOGIC (Pembayaran Berhasil) =====

	/**
	 * Menampilkan modal pembayaran berhasil dengan detail transaksi.
	 * @param {object} transaction - Objek transaksi yang berhasil.
	 */
	function showPaymentSuccessModal(transaction) {
		paymentDetails.innerHTML = `
                    <div class="space-y-2">
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">ID Transaksi:</span><span class="font-medium font-mono text-xs text-gray-800 dark:text-gray-200">${transaction.id}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Nama:</span><span class="font-medium text-gray-800 dark:text-gray-200">${transaction.customerName}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Produk:</span><span class="font-medium text-gray-800 dark:text-gray-200">${transaction.product}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Metode:</span><span class="font-medium text-gray-800 dark:text-gray-200">${paymentMethodNames[transaction.paymentMethod]}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Total Bayar:</span><span class="font-bold text-green-600 dark:text-green-400">${formatCurrency(transaction.total)}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600 dark:text-gray-400">Waktu:</span><span class="font-medium text-gray-800 dark:text-gray-200">${transaction.time}</span></div>
                    </div>`;
		toggleModal(paymentModal, true);
	}

	/**
	 * Menutup modal pembayaran berhasil.
	 */
	function closePaymentSuccessModal() {
		toggleModal(paymentModal, false);
	}

	// ===== MODAL LOGIC (Konfirmasi Hapus Riwayat) =====

	/**
	 * Menampilkan modal konfirmasi untuk menghapus riwayat transaksi.
	 */
	function showClearHistoryConfirmModal() {
		toggleModal(confirmModal, true);
	}

	/**
	 * Menutup modal konfirmasi hapus riwayat.
	 */
	function closeClearHistoryConfirmModal() {
		toggleModal(confirmModal, false);
	}

	/**
	 * Menghapus semua riwayat transaksi.
	 */
	function clearAllTransactions() {
		transactions = [];
		saveTransactions();
		renderTransactions();
		showToast('Riwayat transaksi telah dihapus.', 'success');
		closeClearHistoryConfirmModal();
	}

	// ===== MAIN LOGIC & EVENT LISTENERS =====

	/**
	 * Handler untuk pengiriman formulir pembayaran.
	 * @param {Event} e - Objek event.
	 */
	async function handlePaymentSubmit(e) {
		e.preventDefault();

		const formData = new FormData(paymentForm);
		const selectedProductOption = productSelect.options[productSelect.selectedIndex];

		// Validasi input yang diperluas
		if (!selectedProductOption || !selectedProductOption.value) {
			showToast('Pilih produk terlebih dahulu!', 'error');
			return;
		}

		const customerName = formData.get('customerName').trim();
		const customerEmail = formData.get('customerEmail').trim();
		const paymentMethod = formData.get('paymentMethod');
		const quantityValue = parseInt(formData.get('quantity'), 10);

		if (!customerName) {
			showToast('Nama pelanggan tidak boleh kosong!', 'error');
			return;
		}
		if (!customerEmail) {
			showToast('Email pelanggan tidak boleh kosong!', 'error');
			return;
		}
		if (!isValidEmail(customerEmail)) {
			showToast('Format email tidak valid!', 'error');
			return;
		}
		if (!paymentMethod) {
			showToast('Pilih metode pembayaran!', 'error');
			return;
		}
		if (!quantityValue || quantityValue < 1 || quantityValue > 100) {
			showToast('Kuantitas harus antara 1-100!', 'error');
			return;
		}

		const subtotal = calculateSubtotal();
		if (subtotal <= 0) {
			showToast('Jumlah pembayaran tidak valid. Pastikan produk dan kuantitas benar.', 'error');
			return;
		}

		// Aktifkan loading state pada tombol
		buttonText.classList.add('hidden');
		buttonSpinner.classList.remove('hidden');
		submitButton.disabled = true;
		submitButton.classList.add('opacity-75', 'cursor-not-allowed');

		try {
			// Simulasi delay jaringan/pemrosesan API
			await new Promise(resolve => setTimeout(resolve, 1500));

			const transaction = {
				id: generateTransactionId(),
				customerName: customerName,
				customerEmail: customerEmail,
				product: selectedProductOption.textContent,
				quantity: quantityValue,
				paymentMethod: paymentMethod,
				total: subtotal - appState.currentDiscount,
				time: getCurrentTime()
			};

			transactions.push(transaction);
			saveTransactions();

			showPaymentSuccessModal(transaction);
			renderTransactions();
			resetFormState();
			showToast('Pembayaran berhasil diproses!', 'success');

		} catch (error) {
			console.error("Error saat memproses pembayaran:", error);
			showToast('Terjadi kesalahan saat memproses pembayaran. Coba lagi.', 'error');
		} finally {
			// Nonaktifkan loading state pada tombol
			buttonText.classList.remove('hidden');
			buttonSpinner.classList.add('hidden');
			submitButton.disabled = false;
			submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
		}
	}

	/**
	 * Mengikat semua event listener ke elemen DOM.
	 */
	function bindEventListeners() {
		// Event listener untuk perubahan produk atau kuantitas untuk memperbarui total
		['change', 'input'].forEach(evt => {
			productSelect.addEventListener(evt, updateTotal);
			quantity.addEventListener(evt, updateTotal);
		});

		// Event listener untuk tombol 'Terapkan' promo
		applyPromoBtn.addEventListener('click', applyPromoCode);
		// Event listener untuk menekan 'Enter' di input promo
		promoCodeInput.addEventListener('keypress', e => {
			if (e.key === 'Enter') {
				e.preventDefault();
				applyPromoCode();
			}
		});

		// Event listener untuk submit formulir pembayaran
		paymentForm.addEventListener('submit', handlePaymentSubmit);

		// Event listener untuk tombol 'Tutup' pada modal pembayaran berhasil
		closeModalBtn.addEventListener('click', closePaymentSuccessModal);
		// Event listener untuk klik di luar area modal pembayaran berhasil (overlay)
		paymentModal.addEventListener('click', e => {
			if (e.target === paymentModal) closePaymentSuccessModal();
		});
		// Event listener untuk menekan tombol 'Escape' untuk menutup modal
		document.addEventListener('keydown', e => {
			if (e.key === 'Escape') {
				closePaymentSuccessModal();
				closeClearHistoryConfirmModal();
			}
		});

		// Event listener untuk tombol 'Hapus Riwayat'
		clearHistoryBtn.addEventListener('click', showClearHistoryConfirmModal);

		// Event listener untuk tombol 'Batal' di modal konfirmasi
		cancelConfirmBtn.addEventListener('click', closeClearHistoryConfirmModal);
		// Event listener untuk tombol 'Hapus' di modal konfirmasi
		confirmClearBtn.addEventListener('click', clearAllTransactions);

		// Event listener untuk klik di luar area modal konfirmasi (overlay)
		confirmModal.addEventListener('click', e => {
			if (e.target === confirmModal) closeClearHistoryConfirmModal();
		});
	}

	/**
	 * Fungsi inisialisasi aplikasi.
	 */
	function init() {
		loadTransactions(); // Muat transaksi dari localStorage
		renderTransactions(); // Render daftar transaksi
		updateTotal(); // Perbarui total pembayaran
		bindEventListeners(); // Ikat event listeners

		// Log sukses untuk debugging
		console.log('Sistem Pembayaran Modern berhasil diinisialisasi');
		console.log('Tema saat ini:', currentTheme);
		console.log('Kode promo tersedia:', Object.keys(promoCodes));
	}

	// Jalankan inisialisasi
	init();
});