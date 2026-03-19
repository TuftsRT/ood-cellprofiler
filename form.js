'use strict';

function updateGpuAvailabilityWarning() {
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');
  if (!gpuTypeSelect) {
    return;
  }

  var selectedGpuType = gpuTypeSelect.value;
  var datasetValue = gpuTypeSelect.dataset ? gpuTypeSelect.dataset.unavailableGpus : null;
  var attrValue = datasetValue ? null : gpuTypeSelect.getAttribute('data-unavailable-gpus');
  var unavailableJson = datasetValue || attrValue;

  if (!unavailableJson) {
    return;
  }

  var unavailableMap;
  try {
    unavailableMap = JSON.parse(unavailableJson);
  } catch (_error) {
    return;
  }

  var warningId = 'gpu-unavailable-warning';
  var existingWarning = document.getElementById(warningId);
  var isUnavailable =
    Object.prototype.hasOwnProperty.call(unavailableMap, selectedGpuType) &&
    selectedGpuType !== 'any' &&
    selectedGpuType !== 'none';

  if (isUnavailable) {
    var gpuLabel = unavailableMap[selectedGpuType];
    var warningMessage =
      'All nodes with ' +
      gpuLabel +
      ' GPUs are currently DOWN or DRAINED. Your job will remain queued until nodes become available.';

    if (existingWarning) {
      var messageSpan = existingWarning.querySelector('.gpu-warning-message');
      if (messageSpan) {
        messageSpan.innerHTML = '';
        var strong = document.createElement('strong');
        strong.textContent = 'Warning: ';
        messageSpan.appendChild(strong);
        messageSpan.appendChild(document.createTextNode(warningMessage));
      }
      existingWarning.style.display = 'block';
      return;
    }

    var warning = document.createElement('div');
    warning.id = warningId;
    warning.className = 'alert alert-danger alert-dismissible fade show';
    warning.setAttribute('role', 'alert');
    warning.style.marginTop = '10px';

    var content = document.createElement('span');
    content.className = 'gpu-warning-message';
    var strong = document.createElement('strong');
    strong.textContent = 'Warning: ';
    content.appendChild(strong);
    content.appendChild(document.createTextNode(warningMessage));

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.addEventListener('click', function () {
      warning.style.display = 'none';
    });

    warning.appendChild(content);
    warning.appendChild(closeButton);

    var formGroup = gpuTypeSelect.closest('.mb-3') || gpuTypeSelect.closest('.form-group');
    if (formGroup && formGroup.parentNode) {
      formGroup.parentNode.insertBefore(warning, formGroup.nextSibling);
    }
    return;
  }

  if (existingWarning) {
    existingWarning.style.display = 'none';
  }
}

function repopulateGpuTypesForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');
  if (!partitionSelect || !gpuTypeSelect) {
    return;
  }

  var selectedPartition = partitionSelect.value;
  var datasetValue = gpuTypeSelect.dataset ? gpuTypeSelect.dataset.partitionOptions : null;
  var attrValue = datasetValue ? null : gpuTypeSelect.getAttribute('data-partition-options');
  var optionsJson = datasetValue || attrValue;
  if (!optionsJson) {
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (_error) {
    return;
  }

  var partitionHasGpuOptions = map && Object.prototype.hasOwnProperty.call(map, selectedPartition);
  var gpuFormGroup = gpuTypeSelect.closest('.mb-3') || gpuTypeSelect.closest('.form-group');

  if (!partitionHasGpuOptions) {
    if (gpuFormGroup) {
      gpuFormGroup.style.display = 'none';
    }

    while (gpuTypeSelect.firstChild) {
      gpuTypeSelect.removeChild(gpuTypeSelect.firstChild);
    }

    var noneOption = document.createElement('option');
    noneOption.textContent = 'none';
    noneOption.value = 'none';
    gpuTypeSelect.appendChild(noneOption);
    gpuTypeSelect.value = 'none';
    return;
  }

  if (gpuFormGroup) {
    gpuFormGroup.style.display = '';
  }

  var previousValue = gpuTypeSelect.value;
  var options = map[selectedPartition] || [];

  while (gpuTypeSelect.firstChild) {
    gpuTypeSelect.removeChild(gpuTypeSelect.firstChild);
  }

  options.forEach(function (pair) {
    var option = document.createElement('option');
    option.textContent = pair[0];
    option.value = pair[1];
    gpuTypeSelect.appendChild(option);
  });

  if (previousValue) {
    gpuTypeSelect.value = previousValue;
  }

  if (!gpuTypeSelect.value && gpuTypeSelect.options.length > 0) {
    gpuTypeSelect.selectedIndex = 0;
  }
}

function updateCoresForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');
  var coresInput = document.getElementById('batch_connect_session_context_num_cores');
  if (!partitionSelect || !gpuTypeSelect || !coresInput) {
    return;
  }

  var selectedPartition = partitionSelect.value;
  var selectedGpuType = gpuTypeSelect.value;
  var datasetValue = coresInput.dataset ? coresInput.dataset.partitionGpuMaxCores : null;
  var attrValue = datasetValue ? null : coresInput.getAttribute('data-partition-gpu-max-cores');
  var optionsJson = datasetValue || attrValue;
  if (!optionsJson) {
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (_error) {
    return;
  }

  var maxCores = null;
  if (map[selectedPartition] && map[selectedPartition][selectedGpuType]) {
    maxCores = map[selectedPartition][selectedGpuType];
  } else if (map[selectedPartition] && map[selectedPartition].any) {
    maxCores = map[selectedPartition].any;
  } else if (map.all && map.all[selectedGpuType]) {
    maxCores = map.all[selectedGpuType];
  } else if (map.all && map.all.any) {
    maxCores = map.all.any;
  }

  if (!maxCores || maxCores <= 0) {
    return;
  }

  var currentValue = parseInt(coresInput.value, 10) || 1;
  coresInput.setAttribute('max', maxCores);
  if (currentValue > maxCores) {
    coresInput.value = maxCores;
  }

  var helpText = coresInput.parentElement.querySelector('.form-text, .help-block');
  if (helpText) {
    helpText.textContent =
      'Number of CPU cores to allocate. Max varies by partition and GPU type (Maximum: ' +
      maxCores +
      ' cores).';
  }
}

function updateMemoryForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');
  var memoryInput = document.getElementById('batch_connect_session_context_num_memory');
  if (!partitionSelect || !gpuTypeSelect || !memoryInput) {
    return;
  }

  var selectedPartition = partitionSelect.value;
  var selectedGpuType = gpuTypeSelect.value;
  var datasetValue = memoryInput.dataset ? memoryInput.dataset.partitionGpuMaxMemory : null;
  var attrValue = datasetValue ? null : memoryInput.getAttribute('data-partition-gpu-max-memory');
  var optionsJson = datasetValue || attrValue;
  if (!optionsJson) {
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (_error) {
    return;
  }

  var maxMemoryMb = null;
  if (map[selectedPartition] && map[selectedPartition][selectedGpuType]) {
    maxMemoryMb = map[selectedPartition][selectedGpuType];
  } else if (map[selectedPartition] && map[selectedPartition].any) {
    maxMemoryMb = map[selectedPartition].any;
  } else if (map.all && map.all[selectedGpuType]) {
    maxMemoryMb = map.all[selectedGpuType];
  } else if (map.all && map.all.any) {
    maxMemoryMb = map.all.any;
  }

  if (!maxMemoryMb || maxMemoryMb <= 0) {
    return;
  }

  var maxMemoryGb = Math.round(maxMemoryMb / 1024.0);
  var currentValue = parseFloat(memoryInput.value) || 4;
  memoryInput.setAttribute('max', maxMemoryGb);
  if (currentValue > maxMemoryGb) {
    memoryInput.value = maxMemoryGb;
  }

  var helpText = memoryInput.parentElement.querySelector('.form-text, .help-block');
  if (helpText) {
    helpText.textContent =
      'Amount of memory to allocate per node in GB. Max varies by partition and GPU type (Maximum: ' +
      maxMemoryGb +
      ' GB).';
  }
}

function updateHoursForPartition() {
  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var hoursInput = document.getElementById('batch_connect_session_context_bc_num_hours');
  if (!partitionSelect || !hoursInput) {
    return;
  }

  var selectedPartition = partitionSelect.value;
  var datasetValue = hoursInput.dataset ? hoursInput.dataset.partitionMaxHours : null;
  var attrValue = datasetValue ? null : hoursInput.getAttribute('data-partition-max-hours');
  var optionsJson = datasetValue || attrValue;
  if (!optionsJson) {
    return;
  }

  var map;
  try {
    map = JSON.parse(optionsJson);
  } catch (_error) {
    return;
  }

  var maxHours = map[selectedPartition] || map.all;
  if (!maxHours || maxHours <= 0) {
    return;
  }

  var currentValue = parseInt(hoursInput.value, 10) || 1;
  hoursInput.setAttribute('max', maxHours);
  if (currentValue > maxHours) {
    hoursInput.value = maxHours;
  }

  var helpText = hoursInput.parentElement.querySelector('.form-text, .help-block');
  if (helpText) {
    helpText.textContent =
      'Number of hours to run the job. Max varies by partition (Maximum: ' +
      maxHours +
      ' hours).';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  repopulateGpuTypesForPartition();
  updateCoresForPartition();
  updateMemoryForPartition();
  updateHoursForPartition();
  updateGpuAvailabilityWarning();

  var partitionSelect = document.getElementById('batch_connect_session_context_partition');
  var gpuTypeSelect = document.getElementById('batch_connect_session_context_gpu_type');

  if (partitionSelect) {
    partitionSelect.addEventListener('change', function () {
      repopulateGpuTypesForPartition();
      updateCoresForPartition();
      updateMemoryForPartition();
      updateHoursForPartition();
      updateGpuAvailabilityWarning();
    });
  }

  if (gpuTypeSelect) {
    gpuTypeSelect.addEventListener('change', function () {
      updateCoresForPartition();
      updateMemoryForPartition();
      updateGpuAvailabilityWarning();
    });
  }
});
