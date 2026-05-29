/**
 * config/catastro.js
 * Utilidades para la validación y obtención de coordenadas de referencias catastrales.
 * Incluye soporte para el Catastro oficial de España y validación offline para 
 * las regiones con régimen foral (País Vasco y Navarra).
 */

// Función para validar matemáticamente los dígitos de control de una referencia catastral de 20 caracteres
function validarReferenciaCatastral(referenciaCatastral) {
    if (!referenciaCatastral || referenciaCatastral.length !== 20) {
        return false;
    }

    const rc = referenciaCatastral.toUpperCase();
    const pesoPosicion = [13, 15, 12, 5, 4, 17, 9, 21, 3, 7, 1];
    const letraDc = 'MQWERTYUIOPASDFGHJKLBZX';

    // Se calculan los dos dígitos de control usando subcadenas específicas
    const cadenaPrimerDC = rc.substring(0, 7) + rc.substring(14, 18);
    const cadenaSegundoDC = rc.substring(7, 14) + rc.substring(14, 18);

    function calcularDC(cadena) {
        let suma = 0;
        for (let i = 0; i < cadena.length; i++) {
            let valor = cadena.charCodeAt(i);
            // Conversión de letras a números (A=1, B=2, etc.) según lógica catastral
            if (valor >= 65 && valor <= 90) { // A-Z
                valor = valor - 64;
            } else { // 0-9
                valor = parseInt(cadena[i], 10);
            }
            suma += valor * pesoPosicion[i % pesoPosicion.length];
        }
        return letraDc[suma % 23];
    }

    const dc1 = calcularDC(cadenaPrimerDC);
    const dc2 = calcularDC(cadenaSegundoDC);

    return (dc1 + dc2) === rc.substring(18, 20);
}

/**
 * Valida una Referencia Catastral.
 * Si es del régimen común, llama a Consulta_DNPRC de la API oficial del Catastro.
 * Si es del régimen foral, realiza una validación estructural estricta.
 */
async function validateCadastralRef(rc) {
    if (!rc) {
        return { valid: false, error: 'La referencia catastral es obligatoria.' };
    }
    const cleanRc = rc.trim().toUpperCase().replace(/[\s.-]/g, '');

    // Detect province code from the first 2 characters
    const provCode = cleanRc.substring(0, 2);
    // 01 = Álava, 20 = Gipuzkoa, 48 = Bizkaia, 31 = Navarra
    const isForal = ['01', '20', '48', '31'].includes(provCode);

    if (isForal) {
        let province = '';
        if (provCode === '01') province = 'Álava';
        else if (provCode === '20') province = 'Gipuzkoa';
        else if (provCode === '48') province = 'Bizkaia';
        else if (provCode === '31') province = 'Navarra';

        // Validar si cumple el formato de 20 caracteres nacional
        if (cleanRc.length === 20) {
            const isValidDC = validarReferenciaCatastral(cleanRc);
            if (isValidDC) {
                return {
                    valid: true,
                    isForal: true,
                    province,
                    data: {
                        direccion: `Referencia Foral de ${province}`,
                        provincia: province,
                        municipio: 'Municipio Foral'
                    }
                };
            } else {
                return { valid: false, error: 'Dígitos de control incorrectos para la referencia catastral foral. Revise el formato.' };
            }
        } else {
            // Validar formatos forales locales (ej. Número Fijo de Bizkaia de 9 posiciones, u otras entre 8 y 16)
            if (cleanRc.length >= 8 && cleanRc.length <= 16 && /^[0-9A-Z]+$/.test(cleanRc)) {
                return {
                    valid: true,
                    isForal: true,
                    province,
                    data: {
                        direccion: `Referencia Foral Local de ${province}`,
                        provincia: province,
                        municipio: 'Municipio Foral'
                    }
                };
            } else {
                return { valid: false, error: `La referencia catastral de ${province} debe tener 20 caracteres (nacional) o entre 8 y 16 caracteres (local).` };
            }
        }
    }

    // Régimen común (resto de España)
    if (cleanRc.length !== 20) {
        return { valid: false, error: 'La referencia catastral debe tener exactamente 20 caracteres.' };
    }

    // Validación offline de control para evitar llamadas API innecesarias
    if (!validarReferenciaCatastral(cleanRc)) {
        return { valid: false, error: 'Dígitos de control incorrectos. Verifique la referencia catastral.' };
    }

    try {
        const url = `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${cleanRc}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en el servidor del Catastro (${response.status})`);
        }
        const xmlText = await response.text();

        // Parseo XML seguro utilizando regex
        const errReg = /<cod>([^<]+)<\/cod>/g;
        const msgReg = /<des>([^<]+)<\/des>/g;
        const errors = [];
        const messages = [];
        let match;
        
        while ((match = errReg.exec(xmlText)) !== null) {
            errors.push(match[1].trim());
        }
        while ((match = msgReg.exec(xmlText)) !== null) {
            messages.push(match[1].trim());
        }

        // Si la RC está mal formada (4) o no existe (5)
        if (errors.includes('4') || errors.includes('5') || errors.includes('ERR')) {
            const errorMsg = messages[0] || 'La referencia catastral no existe en el Catastro.';
            return { valid: false, error: errorMsg };
        }

        if (!xmlText.includes('<ldt>')) {
            return { valid: false, error: 'La referencia catastral no se encuentra registrada o es inválida.' };
        }

        const ldtMatch = xmlText.match(/<ldt>([^<]+)<\/ldt>/);
        const provMatch = xmlText.match(/<prov>([^<]+)<\/prov>/);
        const munMatch = xmlText.match(/<muni>([^<]+)<\/muni>/);

        const address = ldtMatch ? ldtMatch[1].trim() : 'Dirección no disponible';
        const provincia = provMatch ? provMatch[1].trim() : '';
        const municipio = munMatch ? munMatch[1].trim() : '';

        return {
            valid: true,
            isForal: false,
            data: {
                direccion: address,
                provincia: provincia,
                municipio: municipio
            }
        };
    } catch (error) {
        console.error('Error al validar RC con Catastro:', error);
        return {
            valid: false,
            error: 'No se pudo conectar con el servidor de Catastro para la verificación en tiempo real. Inténtelo más tarde.'
        };
    }
}

/**
 * Obtiene las coordenadas geográficas de una Referencia Catastral.
 * En regiones forales, devuelve el centro de la provincia como fallback.
 */
async function getCadastralCoords(rc) {
    if (!rc) {
        return { success: false, error: 'Referencia catastral requerida' };
    }
    const cleanRc = rc.trim().toUpperCase().replace(/[\s.-]/g, '');
    const provCode = cleanRc.substring(0, 2);

    // Fallback de coordenadas para territorios históricos
    const foralCapitals = {
        '01': { lat: 42.8467, lng: -2.6723, address: 'Vitoria-Gasteiz, Álava (Mueve el marcador a la granja)' },
        '20': { lat: 43.3183, lng: -1.9812, address: 'Donostia, Gipuzkoa (Mueve el marcador a la granja)' },
        '48': { lat: 43.2630, lng: -2.9350, address: 'Bilbao, Bizkaia (Mueve el marcador a la granja)' },
        '31': { lat: 42.8125, lng: -1.6456, address: 'Pamplona, Navarra (Mueve el marcador a la granja)' }
    };

    if (foralCapitals[provCode]) {
        return {
            success: true,
            isForal: true,
            lat: foralCapitals[provCode].lat,
            lng: foralCapitals[provCode].lng,
            address: foralCapitals[provCode].address
        };
    }

    if (cleanRc.length >= 8 && cleanRc.length <= 16 && !cleanRc.match(/^[0-9]{2}/)) {
        // Asumimos formato foral local si no empieza con código numérico (ej. letra inicial)
        return {
            success: true,
            isForal: true,
            lat: 43.2630,
            lng: -2.9350,
            address: 'Ubicación Foral (Mueve el marcador a la granja)'
        };
    }

    // Régimen común (Consulta_CPMRC requiere exactamente 14 caracteres)
    const rc14 = cleanRc.substring(0, 14);
    
    try {
        const url = `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${rc14}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en servidor del Catastro (${response.status})`);
        }
        const xmlText = await response.text();

        if (!xmlText.includes('<xcen>') || !xmlText.includes('<ycen>')) {
            return { success: false, error: 'No se encontraron coordenadas para esta referencia.' };
        }

        const xcenMatch = xmlText.match(/<xcen>([^<]+)<\/xcen>/);
        const ycenMatch = xmlText.match(/<ycen>([^<]+)<\/ycen>/);
        const ldtMatch = xmlText.match(/<ldt>([^<]+)<\/ldt>/);

        if (!xcenMatch || !ycenMatch) {
            return { success: false, error: 'Coordenadas mal formadas en la respuesta del Catastro.' };
        }

        const lng = parseFloat(xcenMatch[1]);
        const lat = parseFloat(ycenMatch[1]);
        const address = ldtMatch ? ldtMatch[1].trim() : 'Dirección catastral';

        return {
            success: true,
            isForal: false,
            lat,
            lng,
            address
        };
    } catch (error) {
        console.error('Error al obtener coordenadas:', error);
        return { success: false, error: error.message || 'Error al conectar con el servidor de Catastro.' };
    }
}

module.exports = {
    validarReferenciaCatastral,
    validateCadastralRef,
    getCadastralCoords
};
