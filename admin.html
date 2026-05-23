<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="theme-color" content="#000000">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-brand">Admin Dashboard</div>
            <div class="nav-links">
                <a href="index.html" class="nav-link">Back to Site</a>
                <button class="btn-secondary" onclick="downloadDataJson()">Export JSON</button>
                <button class="btn-secondary" onclick="triggerImportJson()">Import JSON</button>
                <button class="btn-danger" onclick="logout()">Logout</button>
                <input type="file" id="importJsonInput" accept=".json,application/json" style="display:none" onchange="handleImportJsonFile(event)">
            </div>
        </div>
    </nav>

    <div class="admin-container">
        <aside class="admin-sidebar">
            <div class="sidebar-menu">
                <a href="#" onclick="switchTab('images')" class="menu-item active" id="tab-images">Images</a>
                <a href="#" onclick="switchTab('banners')" class="menu-item" id="tab-banners">Banners</a>
                <a href="#" onclick="switchTab('videos')" class="menu-item" id="tab-videos">Videos</a>
                <a href="#" onclick="switchTab('preroll')" class="menu-item" id="tab-preroll">Pre-roll Ads</a>
            </div>
        </aside>

        <main class="admin-content">
            <!-- Images Tab -->
            <section id="images-tab" class="tab-content active">
                <div class="tab-header">
                    <h2>Image Management</h2>
                    <button class="btn-primary" onclick="openImageModal()">+ Add Image</button>
                </div>
                <div class="admin-filter">
                    <div class="form-group">
                        <label for="mediaTypeDropdown">Media Type:</label>
                        <select id="mediaTypeDropdown" onchange="filterAdminImages()">
                            <option value="images">Images only</option>
                            <option value="gifs">GIFs only</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="adminFetishDropdown">Fetish:</label>
                        <select id="adminFetishDropdown" onchange="filterAdminImages()">
                            <option value="">All Fetishes</option>
                        </select>
                    </div>
                </div>
                <div id="imagesList" class="images-list"></div>
            </section>

            <!-- Banners Tab -->
            <section id="banners-tab" class="tab-content">
                <div class="tab-header">
                    <h2>Banner Management</h2>
                    <button class="btn-primary" onclick="openBannerModal()">+ Add Banner</button>
                </div>
                <div id="bannersList" class="banners-list"></div>
            </section>

            <!-- Videos Tab -->
            <section id="videos-tab" class="tab-content">
                <div class="tab-header">
                    <h2>Video Management</h2>
                    <button class="btn-primary" onclick="openVideoModal()">+ Add Video</button>
                </div>
                <div id="videosList" class="images-list"></div>
            </section>

            <!-- Pre-roll Ads Tab -->
            <section id="preroll-tab" class="tab-content">
                <div class="tab-header">
                    <h2>Pre-roll Ads</h2>
                    <button class="btn-primary" onclick="openPrerollModal()">+ Add Ad</button>
                </div>
                <div id="preRollList" class="images-list"></div>
            </section>
        </main>
    </div>

    <!-- Image Modal -->
    <div id="imageModal" class="modal">
        <div class="modal-content small">
            <button class="modal-close" onclick="closeImageModal()">&times;</button>
            <h3 id="imageModalTitle">Add Image</h3>
            <form id="imageForm">
                <div class="form-group">
                    <label for="imageLink">Image Link *</label>
                    <input type="url" id="imageLink" required>
                </div>
                <div class="form-group">
                    <label for="imageUrl">Link (Optional)</label>
                    <input type="url" id="imageUrl">
                </div>
                <div class="form-group">
                    <label for="imageFetish">Fetish Category (Optional)</label>
                    <input type="text" id="imageFetish" placeholder="e.g., Bondage, Latex, etc.">
                </div>
                <button type="submit" class="btn-primary">Save Image</button>
            </form>
        </div>
    </div>

    <!-- Banner Modal -->
    <div id="bannerModal" class="modal">
        <div class="modal-content small">
            <button class="modal-close" onclick="closeBannerModal()">&times;</button>
            <h3 id="bannerModalTitle">Add Banner</h3>
            <form id="bannerForm">
                <div class="form-group">
                    <label for="bannerImageLink">Image Link *</label>
                    <input type="url" id="bannerImageLink" required>
                </div>
                <div class="form-group">
                    <label for="bannerRedirectLink">Redirect Link *</label>
                    <input type="url" id="bannerRedirectLink" required>
                </div>
                <div class="form-group">
                    <label for="bannerPosition">Position *</label>
                    <select id="bannerPosition" required>
                        <option value="">Select Position</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                        <option value="left">Left Side</option>
                        <option value="right">Right Side</option>
                        <option value="between">Between Content</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Save Banner</button>
            </form>
        </div>
    </div>

    <!-- Video Modal -->
    <div id="videoModal" class="modal">
        <div class="modal-content small">
            <button class="modal-close" onclick="closeVideoModal()">&times;</button>
            <h3 id="videoModalTitle">Add Video</h3>
            <form id="videoForm">
                <div class="form-group">
                    <label for="videoLink">Video Link *</label>
                    <input type="url" id="videoLink" required>
                </div>
                <div class="form-group">
                    <label for="videoTitle">Video Title</label>
                    <input type="text" id="videoTitle" placeholder="e.g. Title or description" required>
                </div>
                <button type="submit" class="btn-primary">Save Video</button>
            </form>
        </div>
    </div>

    <!-- Pre-roll Ad Modal -->
    <div id="prerollModal" class="modal">
        <div class="modal-content small">
            <button class="modal-close" onclick="closePrerollModal()">&times;</button>
            <h3 id="prerollModalTitle">Add Pre-roll Ad</h3>
            <form id="prerollForm">
                <div class="form-group">
                    <label for="adLink">Ad Video Link *</label>
                    <input type="url" id="adLink" required>
                </div>
                <div class="form-group">
                    <label for="adTitle">Ad Title</label>
                    <input type="text" id="adTitle" placeholder="e.g. Sponsor Ad" required>
                </div>
                <div class="form-group">
                    <label for="adClickUrl">Click-through URL</label>
                    <input type="url" id="adClickUrl" placeholder="https://example.com">
                </div>
                <button type="submit" class="btn-primary">Save Ad</button>
            </form>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <p>&copy; <span id="yearFooter"></span> imageporn Admin. All rights reserved.</p>
    </footer>

    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script src="js/vpn.js"></script>
    <script src="js/firebase-config.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/admin.js"></script>
    <script>
        document.getElementById('yearFooter').textContent = new Date().getFullYear();
    </script>
</body>
</html>
