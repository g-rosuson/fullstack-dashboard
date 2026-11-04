import Turn from './turn/Turn';
import Flex from '@/components/blocks/flex/Flex';

import mappers from './mappers';

import type { McpPersistedPromptEvent } from '@/_types/_gen';
import type { Conversation, ConversationTurn } from '@/shared/types/conversation';

import {
    McpCallEventType,
    type McpPersistedCallFailedEvent,
    McpPersistedCallFailedEventKind,
    McpPersistedCallFailedEventStatus,
    type McpPersistedCallProcessingEvent,
    McpPersistedCallProcessingEventKind,
    McpPersistedCallProcessingEventStatus,
    type McpPersistedCallRefusedEvent,
    McpPersistedCallRefusedEventKind,
    McpPersistedCallRefusedEventStatus,
    type McpPersistedCallSucceededResourceEvent,
    McpPersistedCallSucceededResourceEventKind,
    McpPersistedCallSucceededResourceEventStatus,
    type McpPersistedCallSucceededToolEvent,
    McpPersistedCallSucceededToolEventKind,
    McpPersistedCallSucceededToolEventStatus,
    type McpPersistedPermissionEvent,
    McpPersistedPermissionEventKind,
    McpPersistedPermissionEventType,
    type McpPromptDomain,
    type McpPromptListResourceTemplate,
    type McpPromptListResourceUri,
    type McpPromptListTool,
} from '@/_types/_gen';

const weatherDomain: McpPromptDomain = {
    name: 'weather',
    resources: [{ name: 'current-weather' }, { name: 'city-forecast' }],
    tools: [{ name: 'get_weather' }, { name: 'get_alerts' }],
};

const currentWeatherResource: McpPromptListResourceUri = {
    domain: 'weather',
    name: 'current-weather',
    uri: 'weather://tokyo/current',
};

const cityForecastResource: McpPromptListResourceTemplate = {
    domain: 'weather',
    name: 'city-forecast',
    uriTemplate: 'weather://{city}/forecast',
};

const getWeatherTool: McpPromptListTool = {
    domain: 'weather',
    name: 'get_weather',
    argumentFields: [
        { name: 'city', required: true, type: 'string' },
        { name: 'units', required: false, type: 'string' },
    ],
};

const getAlertsTool: McpPromptListTool = {
    domain: 'weather',
    name: 'get_alerts',
    argumentFields: [{ name: 'region', required: true, type: 'string' }],
};

const refusedWeatherPermission = {
    arguments: { city: null },
    domain: 'weather',
    kind: McpPersistedPermissionEventKind.tool,
    name: 'get_weather',
    type: McpPersistedPermissionEventType.permission,
} satisfies McpPersistedPermissionEvent;

const refusedWeatherCall = {
    arguments: { city: null },
    domain: 'weather',
    kind: McpPersistedCallRefusedEventKind.tool,
    name: 'get_weather',
    status: McpPersistedCallRefusedEventStatus.refused,
    type: McpCallEventType.call,
} satisfies McpPersistedCallRefusedEvent;

const weatherPermission = {
    arguments: { city: 'Tokyo', units: 'celsius' },
    domain: 'weather',
    kind: McpPersistedPermissionEventKind.tool,
    name: 'get_weather',
    type: McpPersistedPermissionEventType.permission,
} satisfies McpPersistedPermissionEvent;

const weatherProcessing = {
    arguments: { city: 'Tokyo', units: 'celsius' },
    domain: 'weather',
    kind: McpPersistedCallProcessingEventKind.tool,
    name: 'get_weather',
    status: McpPersistedCallProcessingEventStatus.processing,
    type: McpCallEventType.call,
} satisfies McpPersistedCallProcessingEvent;

const weatherSucceeded = {
    arguments: { city: 'Tokyo', units: 'celsius' },
    domain: 'weather',
    kind: McpPersistedCallSucceededToolEventKind.tool,
    name: 'get_weather',
    result: {
        content: [{ type: 'text', text: 'Sunny, 22°C.' }, { type: 'text' }],
    },
    status: McpPersistedCallSucceededToolEventStatus.succeeded,
    type: McpCallEventType.call,
} satisfies McpPersistedCallSucceededToolEvent;

const currentWeatherPermission = {
    arguments: { uri: 'weather://tokyo/current' },
    domain: 'weather',
    kind: McpPersistedPermissionEventKind.resource,
    name: 'current-weather',
    type: McpPersistedPermissionEventType.permission,
} satisfies McpPersistedPermissionEvent;

const currentWeatherProcessing = {
    arguments: { uri: 'weather://tokyo/current' },
    domain: 'weather',
    kind: McpPersistedCallProcessingEventKind.resource,
    name: 'current-weather',
    status: McpPersistedCallProcessingEventStatus.processing,
    type: McpCallEventType.call,
} satisfies McpPersistedCallProcessingEvent;

const currentWeatherSucceeded = {
    arguments: { uri: 'weather://tokyo/current' },
    domain: 'weather',
    kind: McpPersistedCallSucceededResourceEventKind.resource,
    name: 'current-weather',
    result: {
        contents: [
            {
                uri: 'weather://tokyo/current',
                mimeType: 'text/plain',
                text: 'Sunny, 22°C.',
            },
            { uri: 'weather://tokyo/current', text: 'Humidity 40%.' },
            { uri: 'weather://tokyo/current' },
        ],
    },
    status: McpPersistedCallSucceededResourceEventStatus.succeeded,
    type: McpCallEventType.call,
} satisfies McpPersistedCallSucceededResourceEvent;

const alertsPermission = {
    arguments: { region: 'Kanto' },
    domain: 'weather',
    kind: McpPersistedPermissionEventKind.tool,
    name: 'get_alerts',
    type: McpPersistedPermissionEventType.permission,
} satisfies McpPersistedPermissionEvent;

const alertsProcessing = {
    arguments: { region: 'Kanto' },
    domain: 'weather',
    kind: McpPersistedCallProcessingEventKind.tool,
    name: 'get_alerts',
    status: McpPersistedCallProcessingEventStatus.processing,
    type: McpCallEventType.call,
} satisfies McpPersistedCallProcessingEvent;

const alertsFailed = {
    arguments: { region: 'Kanto' },
    domain: 'weather',
    kind: McpPersistedCallFailedEventKind.tool,
    name: 'get_alerts',
    status: McpPersistedCallFailedEventStatus.failed,
    type: McpCallEventType.call,
} satisfies McpPersistedCallFailedEvent;

const forecastPermission = {
    arguments: { uri: null },
    domain: 'weather',
    kind: McpPersistedPermissionEventKind.resource,
    name: 'city-forecast',
    type: McpPersistedPermissionEventType.permission,
} satisfies McpPersistedPermissionEvent;

const forecastRefused = {
    arguments: { uri: null },
    domain: 'weather',
    kind: McpPersistedCallRefusedEventKind.resource,
    name: 'city-forecast',
    status: McpPersistedCallRefusedEventStatus.refused,
    type: McpCallEventType.call,
} satisfies McpPersistedCallRefusedEvent;

const mockEvents: McpPersistedPromptEvent[] = [
    refusedWeatherPermission,
    refusedWeatherCall,
    weatherPermission,
    weatherProcessing,
    weatherSucceeded,
    currentWeatherPermission,
    currentWeatherProcessing,
    currentWeatherSucceeded,
    alertsPermission,
    alertsProcessing,
    alertsFailed,
    forecastPermission,
    forecastRefused,
];

const mockTurns: ConversationTurn[] = [
    {
        turnId: '1',
        prompt: 'What is the weather in Tokyo right now, and how does it compare with yesterday?\n\nAlso give me the forecast for the next 3 days, including temperature, rain, and wind. I am packing for a short trip and need to know whether to bring a coat or an umbrella.\n\nFinally, are there any weather alerts for the region? If something is active, say how long it lasts and what I should avoid.',
        answer: 'Tokyo is sunny this afternoon, about 22°C, with a light breeze from the south. Yesterday was cooler and cloudier, so today feels noticeably warmer once you are out of the shade. Humidity is comfortable rather than sticky, and the UV index is high enough that you will want shade or sunscreen through the middle of the day.\n\nDowntown and the bay feel almost the same. Covered streets run a degree or two cooler, while parks and the river paths take the full sun. Moving between indoors and the street, the change you notice is brightness, not a sudden drop in temperature.\n\nThe next three days stay dry. Thursday is clear and mild, Friday warms up with a few high clouds, and Saturday is the hottest of the three with only a small chance of a late shower. Wind stays light, so a light jacket is enough for the evenings and you can leave the umbrella.\n\nThursday starts near 16°C and tops out around 23°C, so the early morning is the only time you will want that jacket on. Friday runs about 18°C to 25°C under thin cloud, still with no rain. Saturday reaches about 27°C, and the small shower chance after 18:00 is a brief sprinkle rather than a soaking.\n\nThere are no active weather alerts for the region. Nothing is scheduled to expire or escalate, so you do not need to change travel plans. Trains and the usual walking routes are operating normally, and there is no heat, wind, or flood notice for the city.\n\nThe nearest watches sit well outside Tokyo and are not expected to drift over the city during this window. If that changes, it would show up as a new alert rather than a quiet upgrade of the current clear conditions.\n\nPack one light jacket for mornings and late evenings, ordinary warm-weather clothes for the afternoons, and leave the raincoat behind. Comfortable walking shoes matter more than extra layers.',
        persistedEvents: mockEvents,
        streamEvents: [],
        domains: [weatherDomain],
        finishedAt: '2026-10-23T12:00:05.000Z',
        startedAt: '2026-10-23T12:00:00.000Z',
        list: {
            resources: [currentWeatherResource, cityForecastResource],
            tools: [getWeatherTool, getAlertsTool],
        },
    },
    {
        turnId: '2',
        prompt: 'Can you check Tokyo again, but only the current conditions this time?\n\nI do not need the multi-day forecast. Just tell me whether it is still sunny, how warm it is, and if the wind has picked up since the last update.',
        answer: 'Tokyo is still sunny. The temperature is holding around 22°C, and the sky is clear enough that you will want shade if you are outside for long. Visibility is excellent, with no haze over the bay.\n\nThe reading has moved less than a degree since the last check, and the feels-like temperature matches it because the air is dry. Direct sun feels warmer than the thermometer, but a short walk in the shade lines up with the 22°C figure.\n\nThe wind has not picked up. It is the same light southerly breeze as before, so conditions are effectively unchanged from the last check. Gusts are absent, and nothing in the next few hours suggests the breeze will strengthen.\n\nHumidity is still comfortable, and there is no drizzle in the current observation. This update is only the live conditions, as you asked: still sunny, still about 22°C, wind still light from the south.',
        persistedEvents: mockEvents,
        streamEvents: [],
        domains: [weatherDomain],
        finishedAt: '2026-10-23T12:00:05.000Z',
        startedAt: '2026-10-23T12:00:00.000Z',
        list: {
            resources: [currentWeatherResource, cityForecastResource],
            tools: [getWeatherTool, getAlertsTool],
        },
    },
];

interface TurnsProps {
    composerHeight: number;
    conversation: Conversation;
}

const Turns = ({ composerHeight, conversation }: TurnsProps) => {
    const mappedTurns = mappers.mapToTurns(mockTurns);

    return (
        <Flex direction="column" gap="xl">
            {mappedTurns.map(turn => (
                <Turn
                    key={turn.turnId}
                    turn={turn}
                    conversationStatus={conversation.status}
                    composerHeight={composerHeight}
                />
            ))}
        </Flex>
    );
};

export default Turns;
