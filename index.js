const { chromium } = require('playwright');
const readline = require('readline');
const mysql = require('mysql2/promise');
const { log } = require('console');

// Creamos una interfaz para capturar la entrada del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    // Conección de la base de Datos
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2590$',
        database: 'amazon_data',
        port:'3307'
    })


    // Preguntamos al usuario qué desea buscar
    rl.question('¿Qué deseas buscar en Amazon? ', async (searchQuery) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Navegamos a Amazon
        await page.goto('https://www.amazon.com.mx/');

        // Escribimos el valor ingresado por el usuario en el campo de búsqueda
        await page.type('#twotabsearchtextbox', searchQuery);
        await page.waitForTimeout(1000); // Esperamos 1 segundo para asegurarnos que los resultados se carguen
        await page.click('#nav-search-submit-button'); // Hacemos clic en el botón de búsqueda
        await page.waitForTimeout(3000); // Esperamos 3 segundos
        // Esperamos que se carguen los resultados
        await page.waitForSelector('.s-main-slot'); // Esperamos hasta que haya resultados
        
        // Extraemos los resultados de la búsqueda usando la clase s-result-item
        const articulos = await page.$$eval('.s-main-slot .s-result-item.s-asin', 
            (results) => (
                results.map((el) => {
                    const title = el.querySelector('h2')?.innerText || 'Título no disponible';
                    const precio = el.querySelector('.a-price .a-offscreen')?.innerText || 'No disponible';
                    const url = el.querySelector('.a-link-normal')?.getAttribute('href');
                    // Extraemos la URL de la imagen
                    const imagen = el.querySelector('img.s-image')?.getAttribute('src') || 'Imagen no disponible';

                    return { title, precio, url: `https://www.amazon.com${url}`, imagen }; // Asegúrate de que la URL sea completa
                }).filter(Boolean) // Filtramos los nulos
            ));

        // Mostramos los resultados en la consola
        if (articulos.length === 0) {
            console.log('No se encontraron artículos. Asegúrate de que la búsqueda sea correcta.');
        } else {
            console.log(articulos);
            for (const articulo of articulos){
                const{title, precio, url, imagen} = articulo;
                await connection.execute('INSERT INTO articulos (title, precio, url, imagen) VALUES (?, ?, ?, ?)', [title, precio, url, imagen])
            }
        }
        console.log('Datos almacenados en la base');
        
        // Agregamos un tiempo de espera para que el usuario vea los resultados antes de cerrar el navegador
        await page.waitForTimeout(5000); // Esperamos 5 segundos antes de cerrar
        await connection.end();
        await browser.close(); // Cerramos el navegador

        // Cerramos la interfaz de readline
        rl.close();
    });
})();
