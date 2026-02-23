// Ativa o suporte a Drag and Drop no Celular de forma segura e responsiva
if (typeof MobileDragDrop !== 'undefined') {
    MobileDragDrop.polyfill({
        dragImageTranslateOverride: MobileDragDrop.scrollBehaviourDragImageTranslateOverride,
        holdToDrag: 250 // O SEGREDO DO MOBILE: Segure por 250ms para agarrar o card. Se for rápido, ele rola a tela!
    });
    window.addEventListener('touchmove', function() {}, {passive: false});
}

document.addEventListener('DOMContentLoaded', () => {
    // Detector de dispositivo Móvel
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // ==========================================
    // BLOCO 1: ESTADO E DADOS (IndexedDB)
    // ==========================================
    let state = { currentTierListId: null, tierLists: {} };
    let draggedImageId = null; 
    let draggedTierId = null;
    const detailImgId = { current: null };

    const createImageObject = (src) => ({
        id: `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        src: src, name: '', rating: 0.0, description: '', positionChange: 0
    });

    const saveState = () => {
        localforage.setItem('tierListAppState', state).catch(err => console.error("Erro interno ao salvar:", err));
    };

    const createNewTierListData = (title) => ({
        title: title,
        tiers: [
            { id: `t1`, label: 'SS', color: '#ff00ff', images: [] },
            { id: `t2`, label: 'S++', color: '#8a2be2', images: [] },
            { id: `t3`, label: 'S', color: '#0000ff', images: [] },
            { id: `t4`, label: 'A', color: '#00bfff', images: [] },
            { id: `t5`, label: 'B', color: '#00ff7f', images: [] },
            { id: `t6`, label: 'C', color: '#ffff00', images: [] },
            { id: `t7`, label: 'D', color: '#ff0000', images: [] },
        ],
        imageBank: []
    });

    const findImageById = (imgId) => {
        const list = state.tierLists[state.currentTierListId];
        let found = list.imageBank.find(i => i.id === imgId);
        if (found) return found;
        for (const t of list.tiers) {
            found = t.images.find(i => i.id === imgId);
            if (found) return found;
        }
        return null;
    };

    // ==========================================
    // BLOCO 2: IMPORTAÇÃO E EXPORTAÇÃO
    // ==========================================
    const exportTemplate = () => {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.querySelector('p').textContent = "Empacotando template... Aguarde.";
            spinner.classList.remove('hidden'); spinner.classList.add('flex');
        }

        setTimeout(() => {
            try {
                const list = state.tierLists[state.currentTierListId];
                if (!list) throw new Error("Nenhuma lista encontrada.");

                const templateList = JSON.parse(JSON.stringify(list));
                templateList.tiers.forEach(tier => {
                    if (tier.images && tier.images.length > 0) {
                        templateList.imageBank.push(...tier.images);
                        tier.images = []; 
                    }
                });

                templateList.title = `Template: ${templateList.title}`;
                
                const jsonString = JSON.stringify(templateList);
                const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `OneViannay_Template_${list.title.replace(/ /g, '_')}.json`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                alert("Erro ao exportar: " + err.message);
            } finally {
                if (spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); spinner.querySelector('p').textContent = "Processando..."; }
            }
        }, 100);
    };

    const importTemplate = (file) => {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) { 
            spinner.querySelector('p').textContent = "Analisando arquivo pesado...";
            spinner.classList.remove('hidden'); spinner.classList.add('flex'); 
        }

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedList = JSON.parse(e.target.result);
                    if (!importedList.tiers || !importedList.imageBank) throw new Error("Estrutura inválida.");
                    
                    const newListId = `list-${Date.now()}`;
                    state.tierLists[newListId] = importedList;
                    state.currentTierListId = newListId;
                    saveState(); render();
                    alert("Template importado com sucesso!");
                } catch(err) {
                    alert("Erro ao ler o arquivo JSON. Ele pode estar corrompido.");
                } finally {
                    if (spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); }
                    const fileInput = document.getElementById('import-json-input');
                    if(fileInput) fileInput.value = '';
                }
            };
            reader.readAsText(file);
        }, 100);
    };

    const exportCardsToImage = () => {
        const list = state.tierLists[state.currentTierListId];
        if (!list) return;
        
        let allImages = [...list.imageBank];
        list.tiers.forEach(t => allImages.push(...t.images));
        if (allImages.length === 0) return alert('Sua lista não tem imagens para exportar.');

        const grid = document.createElement('div');
        grid.style.position = 'absolute'; grid.style.left = '-9999px'; grid.style.width = '800px';
        grid.style.display = 'flex'; grid.style.flexWrap = 'wrap'; grid.style.gap = '15px'; grid.style.padding = '30px'; grid.style.backgroundColor = '#1a202c';

        allImages.forEach(imgObj => {
            const img = document.createElement('img');
            img.src = imgObj.src; img.style.width = '120px'; img.style.height = '120px';
            img.style.objectFit = 'cover'; img.style.borderRadius = '8px';
            grid.appendChild(img);
        });

        document.body.appendChild(grid);
        const spinner = document.getElementById('loading-spinner');
        if(spinner) { spinner.classList.remove('hidden'); spinner.classList.add('flex'); }

        html2canvas(grid, { backgroundColor: '#1a202c', scale: 2, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Deck_Cards_${list.title.replace(/ /g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            document.body.removeChild(grid);
            if(spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); }
        }).catch(() => {
            alert("Falha ao desenhar a grade de cards.");
            if(spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); }
        });
    };

    // ==========================================
    // BLOCO 3: RENDERIZAÇÃO DA INTERFACE
    // ==========================================
    const render = () => {
        const currentList = state.tierLists[state.currentTierListId];
        if (!currentList) return;

        const titleEl = document.getElementById('tierlist-title');
        if(titleEl) titleEl.textContent = currentList.title;
        
        const tiersContainer = document.getElementById('tiers-container');
        if(tiersContainer) {
            tiersContainer.innerHTML = '';
            currentList.tiers.forEach((tier, index) => {
                tiersContainer.appendChild(createTierElement(tier, index, currentList.tiers.length));
            });
        }

        const imageBankDropzone = document.getElementById('image-bank-dropzone');
        if(imageBankDropzone) {
            imageBankDropzone.innerHTML = '';
            currentList.imageBank.forEach(imgObj => {
                imageBankDropzone.appendChild(createImageElement(imgObj));
            });
            addDragAndDropEvents(imageBankDropzone);
        }
        renderManageListModal();
    };

    const createTierElement = (tier, index, totalTiers) => {
        const tierEl = document.createElement('div');
        tierEl.className = 'flex items-stretch transition-transform duration-200 relative'; 
        tierEl.dataset.tierId = tier.id;
        
        // Desativa o drag das tiers no Mobile para não atrapalhar o scroll
        if (!isTouchDevice) {
            tierEl.draggable = true;
            tierEl.classList.add('cursor-move');
        }

        tierEl.innerHTML = `
            <div class="flex-shrink-0 w-24 md:w-32 flex flex-col items-center justify-center p-2 rounded-l-lg relative group">
                <i class="fas fa-grip-vertical absolute left-1 top-1/2 transform -translate-y-1/2 opacity-20 group-hover:opacity-50 pointer-events-none hidden md:block"></i>
                <span contenteditable="true" class="tier-label font-bold text-xl md:text-2xl w-full text-center break-words text-white drop-shadow-md">${tier.label}</span>
                <input type="color" value="${tier.color}" class="tier-color-picker absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <button class="tier-delete-btn absolute bottom-1 right-1 text-xs text-red-800 hover:text-red-900 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="tier-dropzone min-h-[100px] flex-grow bg-gray-900/50 p-3 flex flex-wrap gap-4 items-start border-2 border-gray-700 transition-all duration-300"></div>
            <div class="flex flex-col justify-center bg-gray-800 rounded-r-lg px-2 gap-2 border-l border-gray-700">
                <button class="tier-up-btn text-gray-400 hover:text-white" ${index === 0 ? 'disabled style="opacity:0.2"' : ''}><i class="fas fa-chevron-up"></i></button>
                <button class="tier-down-btn text-gray-400 hover:text-white" ${index === totalTiers - 1 ? 'disabled style="opacity:0.2"' : ''}><i class="fas fa-chevron-down"></i></button>
            </div>
        `;
        
        const tierHeader = tierEl.querySelector('.flex-shrink-0');
        tierHeader.style.backgroundColor = tier.color;
        
        const dropzone = tierEl.querySelector('.tier-dropzone');
        tier.images.forEach(imgObj => dropzone.appendChild(createImageElement(imgObj)));
        
        if (!isTouchDevice) {
            tierEl.addEventListener('dragstart', (e) => {
                if (e.target.tagName.toLowerCase() === 'img') return;
                draggedTierId = tier.id;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => tierEl.classList.add('tier-dragging'), 0);
            });
            tierEl.addEventListener('dragend', () => { draggedTierId = null; tierEl.classList.remove('tier-dragging'); tierEl.style.borderTop = ''; });
            tierEl.addEventListener('dragover', (e) => { e.preventDefault(); if (draggedTierId && draggedTierId !== tier.id) tierEl.style.borderTop = '4px solid #4a90e2'; });
            tierEl.addEventListener('dragleave', () => tierEl.style.borderTop = '');
            tierEl.addEventListener('drop', (e) => { e.preventDefault(); tierEl.style.borderTop = ''; if (draggedTierId && draggedTierId !== tier.id) reorderTiers(draggedTierId, tier.id); });
        }

        addDragAndDropEvents(dropzone);
        tierEl.querySelector('.tier-label').addEventListener('blur', (e) => updateTierProperty(tier.id, 'label', e.target.textContent));
        tierEl.querySelector('.tier-delete-btn').addEventListener('click', () => deleteTier(tier.id));
        tierEl.querySelector('.tier-up-btn').addEventListener('click', () => moveTierButton(index, -1));
        tierEl.querySelector('.tier-down-btn').addEventListener('click', () => moveTierButton(index, 1));
        tierEl.querySelector('.tier-color-picker').addEventListener('input', (e) => tierHeader.style.backgroundColor = e.target.value);
        tierEl.querySelector('.tier-color-picker').addEventListener('change', (e) => { updateTierProperty(tier.id, 'color', e.target.value); });

        return tierEl;
    };

    const createImageElement = (imgObj) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'drag-item relative group w-20 h-20 md:w-24 md:h-24 cursor-pointer';
        wrapper.dataset.imgId = imgObj.id; // Chave para a matemática de reordenação

        const imgEl = document.createElement('img');
        imgEl.src = imgObj.src;
        imgEl.className = 'w-full h-full object-cover rounded-lg shadow-md hover:ring-4 hover:ring-blue-500 transition-all';
        imgEl.draggable = true;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        deleteBtn.className = 'absolute -top-2 -right-2 text-red-500 bg-gray-800 rounded-full text-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-125 z-20';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteImage(imgObj.id); };

        const pos = Number(imgObj.positionChange || 0);
        let badge = pos > 0 ? `<div class="absolute top-0 left-0 bg-green-900/90 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg z-10"><i class="fas fa-arrow-up"></i> ${pos}</div>` 
                  : pos < 0 ? `<div class="absolute top-0 left-0 bg-red-900/90 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg z-10"><i class="fas fa-arrow-down"></i> ${Math.abs(pos)}</div>` 
                  : `<div class="absolute top-0 left-0 bg-gray-800/90 text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg z-10"><i class="fas fa-minus"></i></div>`;

        wrapper.innerHTML = badge;
        wrapper.appendChild(imgEl);
        wrapper.appendChild(deleteBtn);

        wrapper.addEventListener('click', () => openImageDetails(imgObj.id));

        imgEl.addEventListener('dragstart', (e) => {
            draggedImageId = imgObj.id;
            e.stopPropagation(); 
            
            // Só executa o fantasma personalizado no PC. No celular, o polyfill faz sozinho sem bugar.
            if (!isTouchDevice && e.dataTransfer && e.dataTransfer.setDragImage) {
                const rect = wrapper.getBoundingClientRect();
                e.dataTransfer.setDragImage(wrapper, rect.width / 2, rect.height / 2);
            }
            
            setTimeout(() => wrapper.classList.add('dragging'), 0);
        });
        
        imgEl.addEventListener('dragend', () => { 
            wrapper.classList.remove('dragging'); 
            draggedImageId = null; 
        });

        return wrapper;
    };

    // ==========================================
    // BLOCO 4: LÓGICA DE DRAG & DROP E POSIÇÕES
    // ==========================================
    
    // O "Radar": Acha o exato card que está depois de onde você soltou o dedo/mouse
    const getDragAfterElement = (container, x, y) => {
        const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const isSameRow = y >= box.top - 10 && y <= box.bottom + 10;
            if (isSameRow) {
                const offset = x - (box.left + box.width / 2);
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                }
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const reorderTiers = (draggedId, targetId) => {
        const list = state.tierLists[state.currentTierListId];
        const draggedIdx = list.tiers.findIndex(t => t.id === draggedId);
        const targetIdx = list.tiers.findIndex(t => t.id === targetId);
        if (draggedIdx > -1 && targetIdx > -1) {
            const [movedTier] = list.tiers.splice(draggedIdx, 1);
            list.tiers.splice(targetIdx, 0, movedTier);
            saveState(); render();
        }
    };

    const moveTierButton = (currentIndex, direction) => {
        const list = state.tierLists[state.currentTierListId];
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < list.tiers.length) {
            const temp = list.tiers[currentIndex];
            list.tiers[currentIndex] = list.tiers[newIndex];
            list.tiers[newIndex] = temp;
            saveState(); render();
        }
    };

    const moveImage = (imgId, targetDropzone, afterImgId = null) => {
        const list = state.tierLists[state.currentTierListId];
        const targetTierId = targetDropzone.closest('[data-tier-id]')?.dataset.tierId;
        const imgObj = findImageById(imgId);
        if (!imgObj) return;

        list.imageBank = list.imageBank.filter(img => img.id !== imgId);
        list.tiers.forEach(tier => { tier.images = tier.images.filter(img => img.id !== imgId); });
        
        let targetArray = targetTierId ? list.tiers.find(t => t.id === targetTierId)?.images : list.imageBank;

        if (targetArray) {
            if (afterImgId) {
                const insertIndex = targetArray.findIndex(img => img.id === afterImgId);
                if (insertIndex > -1) {
                    targetArray.splice(insertIndex, 0, imgObj);
                } else {
                    targetArray.push(imgObj);
                }
            } else {
                targetArray.push(imgObj);
            }
        }
        
        saveState(); 
        requestAnimationFrame(() => render()); 
    };

    const addDragAndDropEvents = (element) => {
        element.addEventListener('dragenter', e => e.preventDefault()); // Essencial pro celular!
        element.addEventListener('dragover', e => { e.preventDefault(); element.classList.add('drag-over'); });
        element.addEventListener('dragleave', e => element.classList.remove('drag-over'));
        element.addEventListener('drop', e => { 
            e.preventDefault(); 
            element.classList.remove('drag-over'); 
            if (draggedImageId) {
                // Pega as coordenadas X e Y do mouse (PC) ou do Dedo (Mobile)
                const clientX = e.clientX || (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : 0);
                const clientY = e.clientY || (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientY : 0);
                
                const afterElement = getDragAfterElement(element, clientX, clientY);
                const afterImageId = afterElement ? afterElement.dataset.imgId : null;
                
                moveImage(draggedImageId, element, afterImageId);
            } 
        });
    };

    // ==========================================
    // BLOCO 5: EVENTOS E FERRAMENTAS RESTANTES
    // ==========================================
    const addImageFromUrl = (url) => {
        const list = state.tierLists[state.currentTierListId];
        if (!list || !url) return;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const scaleSize = 150 / img.width;
                canvas.width = 150; canvas.height = img.height * scaleSize;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                list.imageBank.push(createImageObject(canvas.toDataURL('image/jpeg', 0.8)));
                saveState(); render();
            } catch (e) {
                list.imageBank.push(createImageObject(proxyUrl));
                saveState(); render();
            }
        };
        img.onerror = () => alert('Erro de CORS na miniatura.');
        img.src = proxyUrl;
    };

    const handleImageUpload = (files) => {
        const list = state.tierLists[state.currentTierListId];
        if (!list) return;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const scaleSize = 150 / img.width;
                        canvas.width = 150; canvas.height = img.height * scaleSize;
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        list.imageBank.push(createImageObject(canvas.toDataURL('image/jpeg', 0.8)));
                        saveState(); render();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const deleteImage = (imgId) => {
        if (!confirm('Remover este item?')) return;
        const list = state.tierLists[state.currentTierListId];
        list.imageBank = list.imageBank.filter(img => img.id !== imgId);
        list.tiers.forEach(tier => { tier.images = tier.images.filter(img => img.id !== imgId); });
        saveState(); render();
    };

    const openImageDetails = (imgId) => {
        const imgObj = findImageById(imgId);
        if (!imgObj) return;
        detailImgId.current = imgId;
        document.getElementById('detail-preview-img').src = imgObj.src;
        document.getElementById('detail-name').value = imgObj.name || '';
        document.getElementById('detail-rating').value = imgObj.rating || '';
        document.getElementById('detail-position').value = imgObj.positionChange || 0;
        document.getElementById('detail-desc').value = imgObj.description || '';
        document.getElementById('image-details-modal').classList.remove('hidden');
    };

    const closeImageDetails = () => { document.getElementById('image-details-modal')?.classList.add('hidden'); detailImgId.current = null; };
    const saveImageDetails = () => {
        if (!detailImgId.current) return;
        const imgObj = findImageById(detailImgId.current);
        if (imgObj) {
            imgObj.name = document.getElementById('detail-name').value.trim();
            imgObj.rating = parseFloat(document.getElementById('detail-rating').value) || 0;
            imgObj.positionChange = parseInt(document.getElementById('detail-position').value) || 0;
            imgObj.description = document.getElementById('detail-desc').value.trim();
            saveState(); render();
        }
        closeImageDetails();
    };

    const updateTierProperty = (tierId, prop, value) => {
        const list = state.tierLists[state.currentTierListId];
        const tier = list.tiers.find(t => t.id === tierId);
        if (tier) { tier[prop] = value; saveState(); }
    };

    const deleteTier = (tierId) => {
        if (!confirm('Apagar esta tier? Os itens voltarão para o banco.')) return;
        const list = state.tierLists[state.currentTierListId];
        const tierIndex = list.tiers.findIndex(t => t.id === tierId);
        if (tierIndex > -1) {
            const [removedTier] = list.tiers.splice(tierIndex, 1);
            list.imageBank.push(...removedTier.images);
            saveState(); render();
        }
    };

    const renderManageListModal = () => {
        const container = document.getElementById('tierlists-selection-container');
        if(!container) return;
        container.innerHTML = '';
        Object.keys(state.tierLists).forEach(listId => {
            const list = state.tierLists[listId];
            const itemEl = document.createElement('div');
            itemEl.className = `flex justify-between items-center p-2 rounded-md ${listId === state.currentTierListId ? 'bg-blue-800' : 'bg-gray-700 hover:bg-gray-600'}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = list.title;
            titleSpan.className = 'cursor-pointer flex-grow';
            titleSpan.onclick = () => { state.currentTierListId = listId; saveState(); render(); document.getElementById('manage-lists-modal')?.classList.add('hidden'); };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.className = 'text-red-400 hover:text-red-200 ml-4 px-2';
            deleteBtn.onclick = () => {
                if (Object.keys(state.tierLists).length <= 1) return alert("Não pode apagar a única lista.");
                if (!confirm(`Apagar a lista "${list.title}"?`)) return;
                delete state.tierLists[listId];
                if (state.currentTierListId === listId) state.currentTierListId = Object.keys(state.tierLists)[0];
                saveState(); render();
            };
            itemEl.appendChild(titleSpan); itemEl.appendChild(deleteBtn);
            container.appendChild(itemEl);
        });
    };

    const addSafeListener = (id, event, handler) => { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); };

    addSafeListener('add-tier-btn', 'click', () => {
        const list = state.tierLists[state.currentTierListId];
        if (!list) return;
        list.tiers.push({ id: `tier-${Date.now()}`, label: 'Nova', color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`, images: [] });
        saveState(); render();
    });

    addSafeListener('add-image-btn', 'click', () => document.getElementById('image-upload-input')?.click());
    addSafeListener('image-upload-input', 'change', (e) => handleImageUpload(e.target.files));
    addSafeListener('add-image-url-btn', 'click', () => { 
        const input = document.getElementById('image-url-input');
        if (input && input.value.trim()) { addImageFromUrl(input.value.trim()); input.value = ''; } 
    });

    const titleEl = document.getElementById('tierlist-title');
    if(titleEl) titleEl.addEventListener('blur', (e) => { const list = state.tierLists[state.currentTierListId]; if (list) { list.title = e.target.textContent; saveState(); renderManageListModal(); } });

    addSafeListener('manage-lists-btn', 'click', () => document.getElementById('manage-lists-modal')?.classList.remove('hidden'));
    addSafeListener('close-modal-btn', 'click', () => document.getElementById('manage-lists-modal')?.classList.add('hidden'));
    addSafeListener('create-new-list-btn', 'click', () => {
        const input = document.getElementById('new-list-name-input');
        if (!input || !input.value.trim()) return alert('Insira um nome.');
        const newListId = `list-${Date.now()}`;
        state.tierLists[newListId] = createNewTierListData(input.value.trim());
        state.currentTierListId = newListId;
        input.value = ''; saveState(); render(); document.getElementById('manage-lists-modal')?.classList.add('hidden');
    });

    addSafeListener('close-details-btn', 'click', closeImageDetails);
    addSafeListener('save-details-btn', 'click', saveImageDetails);
    addSafeListener('image-details-modal', 'click', (e) => { if (e.target.id === 'image-details-modal') closeImageDetails(); });

    addSafeListener('export-template-btn', 'click', exportTemplate);
    addSafeListener('import-template-btn', 'click', () => document.getElementById('import-json-input')?.click());
    addSafeListener('import-json-input', 'change', (e) => { if(e.target.files.length > 0) importTemplate(e.target.files[0]); });
    addSafeListener('export-cards-btn', 'click', exportCardsToImage);

    addSafeListener('export-btn', 'click', () => {
        const spinner = document.getElementById('loading-spinner');
        if(spinner) { spinner.classList.remove('hidden'); spinner.classList.add('flex'); }
        const content = document.querySelector('.md\\:flex-row');
        html2canvas(content, { backgroundColor: '#1a202c', scale: 2, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            const title = document.getElementById('tierlist-title')?.textContent || 'TierList';
            link.download = `${title.replace(/ /g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            if(spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); }
        }).catch(() => {
            alert("Erro ao exportar a imagem principal.");
            if(spinner) { spinner.classList.remove('flex'); spinner.classList.add('hidden'); }
        });
    });

    // ==========================================
    // INICIALIZAÇÃO ASSÍNCRONA 
    // ==========================================
    const init = async () => {
        try {
            const savedState = await localforage.getItem('tierListAppState');
            if (savedState) {
                state = savedState; 
                const upgradeImages = (imgArray) => imgArray.map(img => typeof img === 'string' ? createImageObject(img) : img);
                Object.values(state.tierLists).forEach(list => {
                    list.imageBank = upgradeImages(list.imageBank || []);
                    list.tiers.forEach(tier => { tier.images = upgradeImages(tier.images || []); });
                });
            } else {
                const defaultListId = `list-${Date.now()}`;
                state = {
                    currentTierListId: defaultListId,
                    tierLists: { [defaultListId]: createNewTierListData('Anime OneViannay Rewards') }
                };
            }
            if (!state.currentTierListId || !state.tierLists[state.currentTierListId]) {
                state.currentTierListId = Object.keys(state.tierLists)[0] || null;
            }
            render();
        } catch (err) {
            console.error("Erro fatal ao carregar o banco de dados inicial:", err);
        }
    };
    init();
});