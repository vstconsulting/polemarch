<template>
    <Card title="See Also">
        <ul>
            <li v-for="(href, text) in links">
                <router-link :to="href || '#'">{{ text }}</router-link>
            </li>
        </ul>
    </Card>
</template>
<script>
    export default {
        data() {
            return {
                links: Object.fromEntries(this.value.map(({ module }) => [module, undefined])),
            };
        },
        props: ['value'],
        inject: ['getParentPaths'],
        mounted() {
            const parents = this.getParentPaths();
            const parentUrl = parents[parents.length - 1].url;
            const query = 'name=' + Object.keys(this.links).join(',');
            app.api
                .bulkQuery({ method: 'get', path: parentUrl, query: query })
                .then((resp) =>
                    resp.data.results.forEach(({ id, name }) => (this.links[name] = parentUrl + id)),
                );
        },
        components: { Card: spa.fields.json.components.Card },
    };
</script>
